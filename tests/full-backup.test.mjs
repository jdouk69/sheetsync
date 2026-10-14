import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectBackup, validateBackup, ORDER, APP_ID } from '../base44/shared/fullBackup.js';
import { sha256, zipStream, readZipIndex } from '../src/lib/backupZip.js';

// Import the actual handler with only its hosted SDK/entry-point glue removed.
let handlerSource = await readFile(new URL('../base44/functions/fullBackup/entry.ts', import.meta.url), 'utf8');
handlerSource = handlerSource.replace(/import \{ createClientFromRequest \}[^\n]+\n/, '').replace("'../../shared/fullBackup.js'", JSON.stringify(new URL('../base44/shared/fullBackup.js', import.meta.url).href)).replace("'../../shared/backupZip.js'", JSON.stringify(new URL('../base44/shared/backupZip.js', import.meta.url).href)).replace(/Deno\.serve[^\n]+\n?$/, '');
const { handleBackup } = await import('data:text/javascript;base64,' + Buffer.from(handlerSource).toString('base64'));
const id = n => n.toString(16).padStart(24, '0');
const user = { email: 'owner@example.com', role: 'admin', full_name: 'Owner' };
const url = `https://base44.app/api/apps/${APP_ID}/files/original-receipt.png`;
const uploadedUrl = `https://base44.app/api/apps/${APP_ID}/files/restored-receipt.png`;
const receipt = new TextEncoder().encode('receipt test bytes');
async function fixture() {
  const records = Object.fromEntries(ORDER.map(name => [name, []]));
  records.Project = [{ id: id(1), name: 'Kitchen', created_by: user.email, sharedWith: [{ email: 'contractor@example.com', role: 'editor' }] }];
  records.Budget = [{ id: id(2), projectId: id(1), name: 'Cabinets', amount: 9000 }];
  records.Expense = [{ id: id(3), projectId: id(1), date: '2026-10-14', description: 'Countertops', category: 'Materials', amount: 2700, totalAmount: 6300, depositAmount: 2000, paymentStatus: 'deposit_paid', isPaid: false, photos: [url] }];
  records.BudgetExpense = [{ id: id(4), projectId: id(1), budgetId: id(2), date: '2026-10-14', description: 'Budget expense', amount: 400 }];
  records.Payment = [{ id: id(5), expenseId: id(3), amount: 700, date: '2026-10-14', method: 'Cash', photos: [url] }];
  records.ProjectSnapshot = [{ id: id(6), projectId: id(1), projectName: 'Kitchen', snapshotDate: '2026-10-14T00:00:00Z', data: records.Project[0] }];
  records.ActivityLog = [{ id: id(7), entityId: id(3), entityType: 'expense', action: 'updated_expense', performedBy: user.email }];
  return { format: 'SheetSync', platform: 'Base44', version: 2, sourceAppId: APP_ID, complete: true, records, files: [{ url, path: 'files/11111111-1111-4111-8111-111111111111', size: receipt.length, sha256: await sha256(receipt), contentType: 'image/png', filename: 'receipt.png' }] };
}
function database(initial = {}) {
  const rows = Object.fromEntries([...ORDER, 'BackupRestoreSession'].map(name => [name, structuredClone(initial[name] || [])]));
  let next = 100; let failSessionUpdate = false;
  const entities = Object.fromEntries(Object.keys(rows).map(name => [name, {
    async filter(filter, sort, limit = 100, skip = 0) { return structuredClone(rows[name].filter(row => Object.entries(filter).every(([key, value]) => row[key] === value)).slice(skip, skip + limit)); },
    async get(key) { return structuredClone(rows[name].find(row => row.id === key)); },
    async create(data) { const row = { ...structuredClone(data), id: id(next++) }; rows[name].push(row); return structuredClone(row); },
    async update(key, data) { if (name === 'BackupRestoreSession' && failSessionUpdate) { failSessionUpdate = false; throw Error('Simulated interrupted persistence'); } const row = rows[name].find(row => row.id === key); if (!row) throw Error('Missing record'); Object.assign(row, structuredClone(data)); return structuredClone(row); }
  }]));
  return { rows, entities, failNextSessionUpdate() { failSessionUpdate = true; } };
}
function client(db, account = user) { return { auth: { me: async () => account }, asServiceRole: { entities: db.entities } }; }
async function action(db, data, account = user, bytes = receipt) {
  const response = await handleBackup(new Request('https://test.example/backup', { method: 'POST', body: JSON.stringify(data) }), client(db, account), async () => new Response(bytes));
  return { status: response.status, body: await response.json() };
}
async function begin(db, backup) {
  const result = await action(db, { action: 'begin', backup, requestId: '22222222-2222-4222-8222-222222222222' });
  assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body.sessionId;
}
test('Export paginates and excludes unrelated projects, payments and activity even for admin', async () => {
  const backup = await fixture();
  const own = Array.from({ length: 105 }, (_, i) => ({ ...backup.records.Expense[0], id: id(1000 + i) }));
  const db = database({ ...backup.records, Project: [...backup.records.Project, { id: id(50), name: 'Private', created_by: 'other@example.com' }], Expense: [...own, { ...own[0], id: id(51), projectId: id(50) }], Payment: [{ ...backup.records.Payment[0], expenseId: own[0].id }, { ...backup.records.Payment[0], id: id(52), expenseId: id(51) }], ActivityLog: [{ ...backup.records.ActivityLog[0], entityId: own[0].id }, { ...backup.records.ActivityLog[0], id: id(53), entityId: id(51) }] });
  const result = await collectBackup(db.entities, user);
  assert.equal(result.records.Project.length, 1); assert.equal(result.records.Expense.length, 105);
  assert.equal(result.records.Payment.length, 1); assert.equal(result.records.ActivityLog.length, 1); assert.equal(result.files.length, 1);
});
test('Validation rejects incomplete receipts, broken parent links, duplicate IDs and invalid money', async () => {
  const backup = await fixture(); assert.equal(validateBackup(backup).count, 7);
  for (const mutate of [b => b.files = [], b => b.records.Payment[0].expenseId = id(99), b => b.records.BudgetExpense[0].budgetId = id(99), b => b.records.Payment[0].id = id(1), b => b.records.Expense[0].amount = -1, b => b.platform = 'Sites']) {
    const copy = structuredClone(backup); mutate(copy); assert.throws(() => validateBackup(copy));
  }
});
test('Authentication, admin role and session ownership are enforced', async () => {
  const db = database(); const backup = await fixture();
  assert.equal((await action(db, { action: 'export' }, null)).status, 401);
  assert.equal((await action(db, { action: 'export' }, { email: 'viewer@example.com', role: 'user' })).status, 403);
  const sessionId = await begin(db, backup);
  assert.equal((await action(db, { action: 'step', sessionId }, { email: 'other@example.com', role: 'admin' })).status, 403);
  assert.equal(db.rows.Project.length, 0);
});
test('No records restore before every uploaded receipt passes its checksum', async () => {
  const db = database(); const sessionId = await begin(db, await fixture());
  assert.equal((await action(db, { action: 'step', sessionId })).status, 400);
  assert.equal((await action(db, { action: 'file', sessionId, sourceUrl: url, uploadedUrl }, user, new Uint8Array(receipt.length))).status, 400);
  assert.equal(db.rows.Project.length, 0);
  assert.equal((await action(db, { action: 'file', sessionId, sourceUrl: url, uploadedUrl: 'https://other.example/receipt' })).status, 400);
});
test('Restore remaps all parents and receipts, keeps original finances and does not alter originals', async () => {
  const backup = await fixture(); const originals = structuredClone(backup.records); const db = database(originals);
  const sessionId = await begin(db, backup);
  assert.equal((await action(db, { action: 'file', sessionId, sourceUrl: url, uploadedUrl })).status, 200);
  let result; do { result = await action(db, { action: 'step', sessionId }); assert.equal(result.status, 200); } while (!result.body.complete);
  const project = db.rows.Project[1], expense = db.rows.Expense[1], payment = db.rows.Payment[1];
  assert.equal(project.name, 'Kitchen (restored)'); assert.deepEqual(project.sharedWith, []);
  assert.equal(expense.projectId, project.id); assert.equal(payment.expenseId, expense.id);
  assert.equal(expense.amount, 2700); assert.equal(expense.totalAmount, 6300); assert.equal(expense.depositAmount, 2000); assert.equal(payment.amount, 700);
  assert.deepEqual(expense.photos, [uploadedUrl]); assert.deepEqual(payment.photos, [uploadedUrl]);
  assert.equal(db.rows.BudgetExpense[1].budgetId, db.rows.Budget[1].id);
  assert.equal(db.rows.ProjectSnapshot[1].data.id, project.id); assert.deepEqual(db.rows.ProjectSnapshot[1].data.sharedWith, []);
  assert.equal(db.rows.ActivityLog[1].entityId, expense.id);
  for (const name of ORDER) assert.deepEqual(db.rows[name][0], originals[name][0]);
  await action(db, { action: 'step', sessionId }); for (const name of ORDER) assert.equal(db.rows[name].length, 2);
});
test('Retry after creation succeeded but session persistence failed reuses the created record', async () => {
  const backup = await fixture(); backup.records = { ...backup.records, Payment: [], Expense: [], Budget: [], BudgetExpense: [], ProjectSnapshot: [], ActivityLog: [] }; backup.files = [];
  const db = database(); const sessionId = await begin(db, backup); db.failNextSessionUpdate();
  assert.equal((await action(db, { action: 'step', sessionId })).status, 400); assert.equal(db.rows.Project.length, 1);
  assert.equal((await action(db, { action: 'step', sessionId })).body.complete, true); assert.equal(db.rows.Project.length, 1);
});
test('ZIP writer and reader round trip actual receipt bytes', async () => {
  const backup = await fixture(); const metadata = new TextEncoder().encode(JSON.stringify(backup));
  const blob = await new Response(zipStream([{ name: 'backup.json', size: metadata.length, open: async () => metadata }, { name: backup.files[0].path, size: receipt.length, open: async () => receipt }])).blob();
  const entries = await readZipIndex(blob);
  assert.equal(await sha256(await entries.get(backup.files[0].path).blob.arrayBuffer()), backup.files[0].sha256);
  assert.deepEqual(JSON.parse(await entries.get('backup.json').blob.text()), backup);
});
