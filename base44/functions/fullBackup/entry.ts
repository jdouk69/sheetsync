import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { collectBackup, validateBackup, restoreData, fileUrl, ORDER, MAX_FILE } from '../../shared/fullBackup.js';
import { sha256 } from '../../shared/backupZip.js';

export async function handleBackup(req, client, fetchFile = fetch) {
  try {
    const user = await client.auth.me();
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required.' }, { status: 403 });
    const text = await req.text();
    if (text.length > 20 * 1024 * 1024) throw Error('Backup metadata exceeds 20 MB.');
    const input = JSON.parse(text);
    const entities = client.asServiceRole.entities;
    if (input.action === 'export') return Response.json(await collectBackup(entities, user));
    if (input.action === 'begin') {
      const summary = validateBackup(input.backup);
      if (!/^[0-9a-f-]{36}$/.test(input.requestId)) throw Error('Invalid restore request.');
      const hash = await sha256(new TextEncoder().encode(JSON.stringify(input.backup)));
      const existing = await entities.BackupRestoreSession.filter({ userEmail: user.email, requestId: input.requestId }, 'created_date', 2);
      if (existing.length > 1) throw Error('Conflicting restore sessions; start a fresh restore.');
      if (existing[0]) {
        if (existing[0].backupHash !== hash) throw Error('This restore request belongs to another backup.');
        return Response.json({ sessionId: existing[0].id, summary, fileMap: existing[0].data.fileMap, status: existing[0].status });
      }
      const session = await entities.BackupRestoreSession.create({ userEmail: user.email, requestId: input.requestId, backupHash: hash, status: 'verifying', data: { backup: input.backup, fileMap: {}, idMap: {}, cursor: 0, finalizeCursor: 0 }, created_by: user.email });
      return Response.json({ sessionId: session.id, summary, fileMap: {}, status: session.status });
    }
    if (typeof input.sessionId !== 'string') throw Error('Missing restore session.');
    const session = await entities.BackupRestoreSession.get(input.sessionId);
    if (!session || session.userEmail !== user.email) return Response.json({ error: 'Access denied.' }, { status: 403 });
    const state = session.data;
    const backup = state.backup;
    validateBackup(backup);
    if (input.action === 'file') {
      if (session.status !== 'verifying') throw Error('This restore has already started.');
      const original = backup.files.find(file => file.url === input.sourceUrl);
      if (!original) throw Error('Receipt is not part of this backup.');
      if (!state.fileMap[original.url]) {
        const url = fileUrl(input.uploadedUrl);
        const response = await fetchFile(url, { redirect: 'follow' });
        if (!response.ok || !response.body) throw Error('Could not read the uploaded receipt.');
        const reader = response.body.getReader(); const chunks = []; let size = 0;
        try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > MAX_FILE || size > original.size) throw Error('Uploaded receipt size mismatch.'); chunks.push(part.value); } }
        finally { await reader.cancel(); }
        const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        if (size !== original.size || await sha256(bytes) !== original.sha256) throw Error('Uploaded receipt checksum mismatch.');
        state.fileMap[original.url] = url;
        await entities.BackupRestoreSession.update(session.id, { data: state });
      }
      return Response.json({ verified: true });
    }
    if (input.action !== 'step') throw Error('Unknown backup action.');
    if (session.status === 'complete') return Response.json({ complete: true, restored: state.cursor });
    for (const file of backup.files) if (!state.fileMap[file.url]) throw Error('Verify every receipt before restoring records.');
    const queue = ORDER.flatMap(name => backup.records[name].map(row => ({ name, row })));
    // Small durable batches keep retries practical under hosted function limits.
    for (let i = 0; i < 5 && state.cursor < queue.length; i++) {
      const { name, row } = queue[state.cursor];
      const key = `${session.id}:${row.id}`;
      const previous = await entities[name].filter({ backupRestoreKey: key, created_by: user.email }, 'created_date', 2);
      if (previous.length > 1) throw Error('Conflicting restored records; contact support.');
      if (previous[0] && queue.some(item => item.row.id === previous[0].id)) throw Error('A restore key points to an original record.');
      const result = previous[0] || await entities[name].create(restoreData(name, row, state.idMap, state.fileMap, user, key));
      state.idMap[row.id] = result.id;
      state.cursor++;
      await entities.BackupRestoreSession.update(session.id, { status: 'restoring', data: state });
    }
    if (state.cursor === queue.length) {
      for (let i = 0; i < 5 && state.finalizeCursor < backup.records.Project.length; i++) {
        const row = backup.records.Project[state.finalizeCursor];
        await entities.Project.update(state.idMap[row.id], { name: `${row.name} (restored)` });
        state.finalizeCursor++;
        await entities.BackupRestoreSession.update(session.id, { data: state });
      }
    }
    const complete = state.cursor === queue.length && state.finalizeCursor === backup.records.Project.length;
    if (complete) await entities.BackupRestoreSession.update(session.id, { status: 'complete', data: state });
    return Response.json({ complete, restored: state.cursor, total: queue.length });
  } catch (error) { return Response.json({ error: error.message || 'Backup failed.' }, { status: 400 }); }
}
Deno.serve(req => handleBackup(req, createClientFromRequest(req)));
