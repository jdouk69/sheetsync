import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { zipStream, readZipIndex, sha256, crc32 } from '@/lib/backupZip';
import { validateBackup, fileUrl, MAX_FILE } from '../../../base44/shared/fullBackup';

const enc = new TextEncoder();
async function call(action, data = {}) {
  const result = await base44.functions.invoke('fullBackup', { action, ...data });
  if (result.data?.error) throw Error(result.data.error);
  return result.data;
}
function readableCsv(backup) {
  const names = new Map(backup.records.Project.map(row => [row.id, row.name]));
  const escape = value => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [['Project','Date','Description','Vendor','Category','Paid','Quoted total','Status','Deleted'], ...backup.records.Expense.map(row => [names.get(row.projectId),row.date,row.description,row.vendor,row.category,row.amount,row.totalAmount,row.paymentStatus,row.isDeleted || false])].map(row => row.map(escape).join(',')).join('\r\n');
}
export default function AdminBackup() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  const queryClient = useQueryClient();
  const fail = err => setError(err.response?.data?.error || err.message || 'Backup failed.');
  async function download() {
    setBusy(true); setError(''); setMessage('Collecting your projects and records…');
    try {
      const backup = await call('export');
      const entries = []; let total = 0;
      for (let i = 0; i < backup.files.length; i++) {
        const item = backup.files[i]; fileUrl(item.url);
        setMessage(`Downloading receipt ${i + 1} of ${backup.files.length}…`);
        const response = await fetch(item.url);
        if (!response.ok || !response.body) throw Error('A receipt could not be downloaded. No incomplete backup will be saved.');
        const reader = response.body.getReader(); const chunks = []; let size = 0;
        try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > MAX_FILE) throw Error('A receipt exceeds 25 MB.'); chunks.push(part.value); } }
        finally { await reader.cancel(); }
        total += size; if (total > 1024 * 1024 * 1024) throw Error('Backup files exceed 1 GB.');
        const blob = new Blob(chunks, { type: response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream' });
        Object.assign(item, { size, sha256: await sha256(await blob.arrayBuffer()), contentType: blob.type, filename: decodeURIComponent(new URL(item.url).pathname.split('/').pop()) });
        entries.push({ name: item.path, size, open: async () => blob.stream() });
      }
      setMessage('Checking that records stayed unchanged during the download…');
      const current = await call('export');
      if (JSON.stringify(current.records) !== JSON.stringify(backup.records)) throw Error('Project data changed while the backup was downloading. Please try again.');
      backup.complete = true; validateBackup(backup);
      const metadata = enc.encode(JSON.stringify(backup));
      if (metadata.length > 20 * 1024 * 1024) throw Error('Backup metadata exceeds 20 MB.');
      for (const [name, bytes] of [
        ['backup.json', metadata],
        ['expenses.csv', enc.encode(readableCsv(backup))],
        ['README.txt', enc.encode('SheetSync Base44 complete project backup.\nIncludes owned projects, expenses (including Recently Deleted), payments, budgets, snapshots, related activity, and actual receipt files.\nRestore in Base44 Admin > Backup & Restore by selecting this ZIP. Keep this file somewhere separate from Base44, such as Google Drive.\nRestore creates private project copies with new IDs. Original records are preserved. Sharing permissions must be granted again.\nThis ZIP is for the Base44 app; Sites backups use a separate storage format.\nAccount settings, user accounts, app code, and platform automation settings are not included.\n')]
      ]) entries.unshift({ name, size: bytes.length, open: async () => bytes });
      setMessage('Preparing your ZIP…');
      const blob = await new Response(zipStream(entries)).blob();
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `SheetSync-Base44-backup-${new Date().toISOString().slice(0,10)}.zip`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage(`Backup downloaded: ${backup.records.Project.length} projects, ${backup.files.length} receipt files. Keep a copy in Google Drive or another safe place.`);
    } catch (err) { fail(err); setMessage(''); }
    finally { setBusy(false); }
  }
  async function choose(file) {
    setSelected(null); selectedRef.current = null; setError(''); setMessage('');
    if (!file) return;
    setBusy(true);
    try {
      setMessage('Checking the ZIP and every receipt…');
      const entries = await readZipIndex(file); const metadata = entries.get('backup.json');
      if (!metadata || metadata.size > 20 * 1024 * 1024) throw Error('Backup metadata is missing or too large.');
      const bytes = await metadata.blob.arrayBuffer();
      if (crc32(new Uint8Array(bytes)) !== metadata.crc) throw Error('Backup metadata is damaged.');
      const backup = JSON.parse(new TextDecoder().decode(bytes)); const summary = validateBackup(backup);
      const expected = new Set(['backup.json','expenses.csv','README.txt', ...backup.files.map(row => row.path)]);
      if ([...entries.keys()].some(name => !expected.has(name))) throw Error('The ZIP contains unexpected receipt files.');
      for (let i = 0; i < backup.files.length; i++) {
        const item = backup.files[i]; const entry = entries.get(item.path);
        setMessage(`Checking receipt ${i + 1} of ${backup.files.length}…`);
        if (!entry || entry.size !== item.size) throw Error('A receipt is missing or damaged.');
        const bytes = await entry.blob.arrayBuffer();
        if (crc32(new Uint8Array(bytes)) !== entry.crc || await sha256(bytes) !== item.sha256) throw Error('A receipt checksum does not match.');
      }
      const key = `sheetsync-base44-restore:${await sha256(bytes)}`;
      const requestId = localStorage.getItem(key) || crypto.randomUUID();
      const selection = { backup, entries, summary, requestId, storageKey: key };
      selectedRef.current = selection; setSelected(selection);
      setMessage(`Ready to restore ${summary.projects} projects, ${summary.count} records, and ${summary.files} receipts as separate copies.`);
    } catch (err) { fail(err); setMessage(''); }
    finally { setBusy(false); }
  }
  async function restore() {
    const selection = selectedRef.current; if (!selection) return;
    if (!window.confirm('Create separate restored project copies? Current projects will be preserved. Restored projects start private, with no shared users.')) return;
    setBusy(true); setError('');
    try {
      localStorage.setItem(selection.storageKey, selection.requestId);
      const session = await call('begin', { backup: selection.backup, requestId: selection.requestId });
      for (let i = 0; i < selection.backup.files.length; i++) {
        const item = selection.backup.files[i];
        if (session.fileMap[item.url]) continue;
        setMessage(`Uploading and checking receipt ${i + 1} of ${selection.backup.files.length}…`);
        const receipt = new File([selection.entries.get(item.path).blob], item.filename || 'receipt', { type: item.contentType });
        const uploaded = await base44.integrations.Core.UploadFile({ file: receipt });
        await call('file', { sessionId: session.sessionId, sourceUrl: item.url, uploadedUrl: uploaded.file_url });
      }
      while (true) {
        const progress = await call('step', { sessionId: session.sessionId });
        setMessage(`Restoring records: ${progress.restored} of ${progress.total ?? selection.summary.count}…`);
        if (progress.complete) break;
      }
      localStorage.removeItem(selection.storageKey);
      selectedRef.current = null; setSelected(null);
      await queryClient.invalidateQueries();
      setMessage('Restore complete. Your project copies end with “(restored)”. Current projects were preserved.');
    } catch (err) { fail(err); setMessage('Restore paused. Select the same ZIP again to resume. Incomplete project copies are marked “(restoring)”.'); }
    finally { setBusy(false); }
  }
  return <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
    <h2 className="text-lg font-semibold">Backup &amp; Restore</h2>
    <p className="text-sm text-slate-600">Download your owned projects, expenses, payments, budgets, history, and actual receipt files in one ZIP. Store a copy in Google Drive or another safe place.</p>
    <button className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50" onClick={download} disabled={busy}>Download complete backup ZIP</button>
    <div className="border-t pt-4 space-y-3">
      <h3 className="font-medium">Restore from a Base44 backup</h3>
      <p className="text-sm text-slate-600">Select the ZIP without unzipping it. Restore creates separate private project copies and preserves current projects. Sharing can be set up again afterward.</p>
      <input aria-label="Select Base44 backup ZIP" type="file" accept=".zip,application/zip" disabled={busy} onChange={event => choose(event.target.files?.[0])} />
      {selected && <div><button className="bg-amber-600 text-white rounded-lg px-4 py-2 disabled:opacity-50" disabled={busy} onClick={restore}>Restore as project copies</button></div>}
    </div>
    {message && <p className="text-sm text-blue-700" role="status">{message}</p>}
    {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    <p className="text-xs text-slate-500">Manual backups only. Account settings and app code are not included. Use this app’s ZIP to restore here; Sites ZIP backups are separate.</p>
  </div>;
}
