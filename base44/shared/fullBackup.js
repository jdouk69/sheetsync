import { schemas } from './backupSchemas.js';

export const APP_ID = '69549a260e8041a98ad0d0ec';
export const ORDER = ['Project', 'Budget', 'Expense', 'BudgetExpense', 'Payment', 'ProjectSnapshot', 'ActivityLog'];
export const MAX_FILE = 25 * 1024 * 1024;
export function fileUrl(value) {
  if (typeof value !== 'string') throw Error('Invalid receipt URL.');
  const url = new URL(value);
  if (url.origin !== 'https://base44.app' || !url.pathname.startsWith(`/api/apps/${APP_ID}/files/`) || url.username || url.password || url.hash) throw Error('Backup contains a receipt outside this Base44 app.');
  return value;
}
export function photosIn(value, found = new Set()) {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) { for (const item of value) photosIn(item, found); return found; }
  for (const [key, item] of Object.entries(value)) {
    if (key === 'photos' && Array.isArray(item)) for (const url of item) found.add(fileUrl(url));
    else photosIn(item, found);
  }
  return found;
}
export async function all(entity, filter) {
  const rows = [];
  for (let skip = 0; ; skip += 100) {
    const page = await entity.filter(filter, 'created_date', 100, skip);
    rows.push(...page);
    if (rows.length > 20000) throw Error('Too many records for one backup.');
    if (page.length < 100) return rows;
  }
}
export async function collectBackup(entities, user) {
  // Personal backups include owned projects only, even for a super admin.
  const records = Object.fromEntries(ORDER.map(name => [name, []]));
  records.Project = await all(entities.Project, { created_by: user.email });
  for (const project of records.Project) {
    await Promise.all(['Budget', 'Expense', 'BudgetExpense', 'ProjectSnapshot'].map(async name => records[name].push(...await all(entities[name], { projectId: project.id }))));
  }
  const expenseIds = new Set(records.Expense.map(row => row.id));
  records.Payment = (await all(entities.Payment, {})).filter(row => expenseIds.has(row.expenseId));
  const scopedIds = new Set(Object.values(records).flat().map(row => row.id));
  // Include only audit entries referring to records included in this backup.
  records.ActivityLog = (await all(entities.ActivityLog, {})).filter(row => scopedIds.has(row.entityId));
  const unique = new Map(records.ActivityLog.map(row => [row.id, row]));
  records.ActivityLog = [...unique.values()];
  const urls = [...photosIn(records)];
  if (urls.length > 2000) throw Error('Too many receipt files for one backup.');
  return { format: 'SheetSync', platform: 'Base44', version: 2, sourceAppId: APP_ID, exportedAt: new Date().toISOString(), records,
    files: urls.map(url => ({ url, path: `files/${crypto.randomUUID()}` })) };
}
function validateField(value, schema, label) {
  if (value === undefined || value === null) return;
  const type = schema.type;
  if (type === 'string' && typeof value !== 'string' || type === 'number' && (typeof value !== 'number' || !Number.isFinite(value)) || type === 'boolean' && typeof value !== 'boolean' || type === 'array' && !Array.isArray(value) || type === 'object' && (typeof value !== 'object' || Array.isArray(value))) throw Error(`Invalid ${label}.`);
  if (schema.enum && !schema.enum.includes(value)) throw Error(`Invalid ${label}.`);
  if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error(`Invalid ${label}.`);
  if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) throw Error(`Invalid ${label}.`);
  if (type === 'array') for (const item of value) validateField(item, schema.items || {}, label);
  if (type === 'object') {
    for (const field of schema.required || []) if (value[field] === undefined || value[field] === null) throw Error(`Missing ${label}.${field}.`);
    for (const [field, child] of Object.entries(schema.properties || {})) validateField(value[field], child, `${label}.${field}`);
  }
}
export function validateBackup(backup) {
  if (!backup || backup.format !== 'SheetSync' || backup.platform !== 'Base44' || backup.version !== 2 || backup.sourceAppId !== APP_ID || backup.complete !== true) throw Error('Select a complete ZIP backup made by this Base44 app.');
  if (!backup.records || typeof backup.records !== 'object' || !Array.isArray(backup.files) || backup.files.length > 2000) throw Error('Invalid backup.');
  const ids = new Map(); const globalIds = new Set(); let count = 0;
  for (const name of ORDER) {
    const rows = backup.records[name];
    if (!Array.isArray(rows)) throw Error(`Missing ${name} records.`);
    const local = new Map(); ids.set(name, local);
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || !/^[0-9a-f]{24}$/.test(row.id) || globalIds.has(row.id) || ++count > 20000) throw Error('Invalid or duplicate record identifier.');
      globalIds.add(row.id);
      validateField(row, schemas[name], name);
      for (const key of ['amount', 'totalAmount', 'depositAmount', 'taxAmount']) if (row[key] != null && (typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] < 0)) throw Error(`Invalid ${name} amount.`);
      local.set(row.id, row);
    }
  }
  for (const name of ['Budget', 'Expense', 'BudgetExpense', 'ProjectSnapshot']) for (const row of backup.records[name]) if (!ids.get('Project').has(row.projectId)) throw Error('A record refers to a missing project.');
  for (const row of backup.records.Payment) if (!ids.get('Expense').has(row.expenseId) || row.amount <= 0) throw Error('Invalid payment relationship or amount.');
  for (const row of backup.records.BudgetExpense) if (ids.get('Budget').get(row.budgetId)?.projectId !== row.projectId) throw Error('Invalid budget relationship.');
  const files = new Map(); const paths = new Set(); let bytes = 0;
  for (const file of backup.files) {
    fileUrl(file.url);
    if (files.has(file.url) || paths.has(file.path) || !/^files\/[0-9a-f-]{36}$/.test(file.path) || !/^[0-9a-f]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_FILE || typeof file.contentType !== 'string' || !/^(image\/|application\/pdf$)/.test(file.contentType)) throw Error('Invalid receipt manifest.');
    bytes += file.size; if (bytes > 1024 * 1024 * 1024) throw Error('Backup files exceed 1 GB.');
    files.set(file.url, file); paths.add(file.path);
  }
  for (const url of photosIn(backup.records)) if (!files.has(url)) throw Error('A receipt is missing from the backup.');
  return { count, projects: backup.records.Project.length, files: files.size };
}
export function restoreData(name, row, idMap, fileMap, user, restoreKey) {
  const remap = value => {
    if (typeof value === 'string') return fileMap[value] || value;
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === 'sharedWith' ? [] : ['id','projectId','expenseId','budgetId','entityId'].includes(key) && typeof child === 'string' ? idMap[child] || child : remap(child)]));
    return value;
  };
  // Only schema fields are writable; source audit metadata is not impersonated.
  const data = {};
  for (const field of Object.keys(schemas[name].properties)) if (row[field] !== undefined) data[field] = remap(row[field]);
  for (const key of ['projectId','budgetId','expenseId','entityId']) if (data[key]) {
    if (!idMap[row[key]]) throw Error('Parent record has not been restored.');
    data[key] = idMap[row[key]];
  }
  if (name === 'Project') { data.name = `${row.name} (restoring)`; data.sharedWith = []; }
  if (name === 'Expense') { data.updated_by = user.email; data.updatedByName = user.full_name || user.email; }
  return { ...data, created_by: user.email, backupRestoreKey: restoreKey };
}
