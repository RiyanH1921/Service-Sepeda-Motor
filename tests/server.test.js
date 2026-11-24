import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.js';

async function serve(databasePath = ':memory:') {
  const app = await createApp({ databasePath });
  await new Promise(done => app.server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const api = async (path, body, method = 'POST', extra = {}) => { const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...extra }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: response.status, body: await response.json() }; };
  return { ...app, base, api };
}
test('API menyimpan kendaraan dan banyak pekerjaan, mencegah duplikat dan menolak koreksi tidak valid', async () => {
  const app = await serve();
  try {
    const motor = await app.api('/api/vehicles', { id: 'v1', name: 'Vario', plate: 'B1', odometerKm: 14500 }); assert.equal(motor.status, 200);
    const input = { id: 's1', vehicleId: 'v1', date: '2026-11-19', jobs: ['Ganti oli', 'Kampas rem'], costRp: 0, odometerKm: 12000 };
    assert.equal((await app.api('/api/visits', input)).status, 200); await app.api('/api/visits', input);
    const bad = await app.api('/api/vehicles/v1/odometer', { odometerKm: 12000 }, 'PUT'); assert.equal(bad.status, 400); assert.match(bad.body.error, /14.500/);
    const badEdit = await app.api('/api/visits/s1', { ...input, jobs: [] }, 'PUT'); assert.equal(badEdit.status, 400);
    const state = await app.api('/api/state', undefined, 'GET'); assert.equal(state.body.visits.length, 1); assert.equal(state.body.visits[0].jobs.length, 2); assert.equal(state.body.vehicles[0].odometerKm, 14500);
  } finally { await app.close(); }
});
test('SQLite mempertahankan kendaraan dan preferensi setelah server dibuka ulang', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'buku-servis-web-')); const path = join(dir, 'test.sqlite');
  let app = await serve(path);
  try {
    await app.api('/api/vehicles', { id: 'v1', name: 'Vario', plate: 'B1' });
    await app.api('/api/preferences', { profileName: 'Riyan Uji', notifications: true }, 'PUT');
    await app.close(); app = await serve(path);
    const { body } = await app.api('/api/state', undefined, 'GET'); assert.equal(body.preferences.profileName, 'Riyan Uji'); assert.equal(body.preferences.notifications, true); assert.equal(body.vehicles[0].id, 'v1');
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});
test('ekspor / impor API bisa dipulihkan dan impor CSV rusak tidak menambah data', async () => {
  const source = await serve(), target = await serve();
  try {
    await source.api('/api/demo', {});
    const response = await fetch(source.base + '/api/export'); const csv = await response.text(); assert.equal(response.headers.get('X-Visit-Count'), '3');
    const imported = await target.api('/api/import', { csv }); assert.equal(imported.body.result.imported, 3);
    const repeated = await target.api('/api/import', { csv }); assert.equal(repeated.body.result.skipped, 3);
    const bad = await target.api('/api/import', { csv: csv + 'baris rusak\n' }); assert.equal(bad.status, 400); assert.match(bad.body.error, /Baris/);
    const current = await target.api('/api/state', undefined, 'GET'); assert.equal(current.body.visits.length, 3);
  } finally { await source.close(); await target.close(); }
});
test('mutasi dari situs lain dan body bukan JSON ditolak', async () => {
  const app = await serve();
  try {
    const cross = await app.api('/api/demo', {}, 'POST', { Origin: 'https://example.com' }); assert.equal(cross.status, 403);
    const response = await fetch(app.base + '/api/demo', { method: 'POST', body: 'not-json', headers: { 'Content-Type': 'text/plain' } }); assert.equal(response.status, 415);
    const absent = await app.api('/api/visits/absent', {}, 'PUT'); assert.equal(absent.status, 404);
    assert.equal((await app.api('/api/state', undefined, 'GET')).body.vehicles.length, 0);
  } finally { await app.close(); }
});
