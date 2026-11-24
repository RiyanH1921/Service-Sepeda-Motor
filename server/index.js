import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { AppError, check, saveVehicle, updateOdometer, saveVisit, saveReminder, savePreferences, claimNotifications, loadDemo, todayISO } from '../shared/domain.js';
import { exportCsv, importCsv } from '../shared/csv.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  const buffers = []; let length = 0;
  for await (const chunk of req) { length += chunk.length; check(length <= 45 * 1024 * 1024, 'Berkas terlalu besar. Maksimal CSV 20 MB.', 413); buffers.push(chunk); }
  try { return JSON.parse(Buffer.concat(buffers).toString('utf8')); } catch { throw new AppError('Isi permintaan bukan JSON yang valid.'); }
}
export async function createApp({ databasePath = process.env.BUKU_SERVIS_DB || resolve(root, 'data/buku-servis.sqlite'), dev = false } = {}) {
  const store = new Store(databasePath);
  let vite;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        const hostname = (req.headers.host || '').split(':')[0];
        check(['localhost', '127.0.0.1'].includes(hostname), 'Host tidak diizinkan.', 403);
        const origin = req.headers.origin;
        if (origin) { const parsed = new URL(origin); check(['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.port === String(server.address().port), 'Asal permintaan tidak diizinkan.', 403); }
        if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, app: 'buku-servis-web' });
        if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, { ...store.read(), today: todayISO() });
        if (req.method === 'GET' && url.pathname === '/api/export') {
          const state = store.read();
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="buku-servis-${todayISO()}.csv"`, 'Cache-Control': 'no-store', 'X-Visit-Count': String(state.visits.length), 'X-Content-Type-Options': 'nosniff' });
          return res.end('\uFEFF' + exportCsv(state));
        }
        check(['POST', 'PUT'].includes(req.method), 'Endpoint tidak ditemukan.', 404);
        check((req.headers['content-type'] || '').startsWith('application/json'), 'Gunakan Content-Type application/json.', 415);
        const body = await readJson(req);
        check(body && typeof body === 'object' && !Array.isArray(body), 'Isi permintaan tidak valid.');
        let operation;
        if (url.pathname === '/api/vehicles' && req.method === 'POST') operation = state => saveVehicle(state, body);
        else if (/^\/api\/vehicles\/[^/]+$/.test(url.pathname) && req.method === 'PUT') {
          const id = decodeURIComponent(url.pathname.split('/')[3]);
          operation = state => { check(state.vehicles.some(v => v.id === id), 'Kendaraan tidak ditemukan.', 404); return saveVehicle(state, { ...body, id }); };
        } else if (/^\/api\/vehicles\/[^/]+\/odometer$/.test(url.pathname) && req.method === 'PUT') operation = state => updateOdometer(state, decodeURIComponent(url.pathname.split('/')[3]), body.odometerKm);
        else if (url.pathname === '/api/visits' && req.method === 'POST') operation = state => saveVisit(state, body);
        else if (/^\/api\/visits\/[^/]+$/.test(url.pathname) && req.method === 'PUT') {
          const id = decodeURIComponent(url.pathname.split('/')[3]);
          operation = state => { check(state.visits.some(v => v.id === id), 'Catatan tidak ditemukan.', 404); return saveVisit(state, { ...body, id }); };
        } else if (url.pathname === '/api/reminders' && req.method === 'POST') operation = state => saveReminder(state, body);
        else if (/^\/api\/reminders\/[^/]+$/.test(url.pathname) && req.method === 'PUT') {
          const id = decodeURIComponent(url.pathname.split('/')[3]);
          operation = state => { check(state.reminders.some(r => r.id === id), 'Pengingat tidak ditemukan.', 404); return saveReminder(state, { ...body, id }); };
        } else if (url.pathname === '/api/preferences' && req.method === 'PUT') operation = state => savePreferences(state, body);
        else if (url.pathname === '/api/demo' && req.method === 'POST') operation = state => loadDemo(state);
        else if (url.pathname === '/api/import' && req.method === 'POST') {
          check(typeof body.csv === 'string' && Buffer.byteLength(body.csv) <= 20 * 1024 * 1024, 'Berkas CSV maksimal 20 MB.');
          operation = state => importCsv(state, body.csv);
        } else if (url.pathname === '/api/notifications/claim' && req.method === 'POST') operation = state => claimNotifications(state);
        else throw new AppError('Endpoint tidak ditemukan.', 404);
        return json(res, 200, store.mutate(operation));
      }
      if (vite) return vite.middlewares(req, res);
      check(['GET', 'HEAD'].includes(req.method), 'Halaman tidak ditemukan.', 404);
      const directory = resolve(root, 'web-dist');
      let path = resolve(directory, '.' + decodeURIComponent(url.pathname));
      check(path === directory || path.startsWith(directory + sep), 'Halaman tidak ditemukan.', 404);
      try { if (!(await stat(path)).isFile()) path = resolve(directory, 'index.html'); }
      catch { path = resolve(directory, 'index.html'); }
      const content = await readFile(path);
      res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': extname(path) === '.html' ? 'no-cache' : 'public, max-age=3600' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!(error instanceof AppError)) console.error(error);
      if (!res.headersSent) json(res, error.status || 500, { error: error instanceof AppError ? error.message : 'Penyimpanan gagal. Periksa ruang penyimpanan, lalu coba lagi. Isian Anda tetap tersedia.' });
      else res.end();
    }
  });
  if (dev) {
    const { createServer } = await import('vite');
    vite = await createServer({ root, server: { middlewareMode: true, ws: { server } }, appType: 'spa' });
  }
  return { server, store, close: async () => { if (vite) await vite.close(); await new Promise(done => server.close(done)); store.close(); } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dev = process.argv.includes('--dev');
  const port = Number(process.env.PORT || 3000);
  const app = await createApp({ dev });
  app.server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} sedang dipakai. Buka http://localhost:${port}, atau jalankan dengan PORT lain.` : error); process.exit(1); });
  app.server.listen(port, '127.0.0.1', () => console.log(`\n  Buku Servis Motor ${dev ? '· mode pengembangan' : ''}\n  Buka browser: http://localhost:${port}\n  Data tersimpan: ${process.env.BUKU_SERVIS_DB || 'data/buku-servis.sqlite'}\n`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
}
