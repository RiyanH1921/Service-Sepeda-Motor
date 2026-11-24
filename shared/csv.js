import { AppError, check, cleanText, integer, normalize, plateKey, saveVehicle, saveVisit, sortedVisits, todayISO } from './domain.js';

export const CSV_HEADER = ['id_servis', 'id_kendaraan', 'nama_kendaraan', 'pelat', 'tanggal_servis', 'dibuat_pada', 'pekerjaan', 'odometer_km', 'biaya_rp', 'bengkel', 'catatan'];
export function csvRow(fields) {
  return fields.map(value => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(',') + '\r\n';
}
export function parseCsv(source) {
  check(typeof source === 'string', 'Isi CSV tidak valid.');
  const text = source.replace(/^\uFEFF/, '');
  const rows = [];
  let fields = [], field = '', quoted = false, closed = false, touched = false, line = 1, startLine = 1;
  const fail = (reason, at = line) => { throw new AppError(`Baris ${at}: ${reason}.`); };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]; touched = true;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; }
      } else { field += c; if (c === '\n' || (c === '\r' && text[i + 1] !== '\n')) line++; }
    } else if (c === ',') { fields.push(field); field = ''; closed = false; }
    else if (c === '\n' || c === '\r') {
      fields.push(field); rows.push({ line: startLine, fields }); fields = []; field = ''; closed = false; touched = false;
      if (c === '\r' && text[i + 1] === '\n') i++;
      startLine = ++line;
    } else if (c === '"' && field === '' && !closed) quoted = true;
    else if (closed || c === '"') fail('tanda kutip tidak valid');
    else field += c;
  }
  if (quoted) fail('tanda kutip belum ditutup', startLine);
  if (touched) { fields.push(field); rows.push({ line: startLine, fields }); }
  check(rows.length > 0 && JSON.stringify(rows[0].fields) === JSON.stringify(CSV_HEADER), 'Baris 1: judul kolom harus sesuai format Buku Servis.');
  for (const row of rows.slice(1)) if (row.fields.length !== CSV_HEADER.length) fail('jumlah kolom harus 11', row.line);
  return rows.slice(1);
}
export function exportCsv(state) {
  let text = csvRow(CSV_HEADER);
  for (const visit of sortedVisits(state)) {
    const vehicle = state.vehicles.find(v => v.id === visit.vehicleId);
    for (const job of visit.jobs) text += csvRow([visit.id, vehicle.id, vehicle.name, vehicle.plate, visit.date, visit.createdAt, job, visit.odometerKm, visit.costRp, visit.workshop, visit.notes]);
  }
  return text;
}
const metadata = visit => JSON.stringify([visit.vehicleId, visit.date, visit.createdAt, visit.odometerKm, visit.costRp, visit.workshop, visit.notes]);
export function importCsv(state, text, today = todayISO()) {
  const rows = parseCsv(text), groups = new Map();
  for (const row of rows) {
    const f = row.fields;
    try {
      const id = cleanText(f[0], 'ID servis', 200, true);
      const vehicleId = cleanText(f[1], 'ID kendaraan', 200, true);
      let vehicle = state.vehicles.find(v => v.id === vehicleId);
      if (vehicle) check(plateKey(vehicle.plate) === plateKey(f[3]) && vehicle.name === f[2], 'ID kendaraan bertentangan dengan nama atau pelat tersimpan');
      else vehicle = saveVehicle(state, { id: vehicleId, name: f[2], plate: f[3], odometerKm: null });
      const candidate = { id, vehicleId, date: f[4], createdAt: f[5], jobs: [cleanText(f[6], 'Nama pekerjaan', 100, true)], odometerKm: integer(f[7], 'Odometer'), costRp: integer(f[8], 'Biaya'), workshop: cleanText(f[9], 'Bengkel', 150), notes: cleanText(f[10], 'Catatan', 10000) };
      const rawMetadata = JSON.stringify(f.filter((_, index) => index !== 6));
      const group = groups.get(id);
      if (group) {
        check(group.rawMetadata === rawMetadata, 'metadata kunjungan dengan ID sama berbeda');
        check(!group.visit.jobs.some(job => normalize(job) === normalize(candidate.jobs[0])), 'pekerjaan duplikat dalam satu kunjungan');
        group.visit.jobs.push(candidate.jobs[0]);
      } else groups.set(id, { visit: candidate, rawMetadata, line: row.line });
    } catch (error) { throw new AppError(`Baris ${row.line}: ${error.message.replace(/\.$/, '')}.`); }
  }
  let imported = 0, skipped = 0;
  for (const { visit, line } of groups.values()) {
    try {
      const existing = state.visits.find(v => v.id === visit.id);
      if (existing) {
        check(metadata(existing) === metadata(visit), 'ID servis bertentangan dengan catatan tersimpan');
        check(JSON.stringify(existing.jobs.map(normalize).sort()) === JSON.stringify(visit.jobs.map(normalize).sort()), 'pekerjaan berbeda untuk ID servis tersimpan');
        skipped++;
      } else { saveVisit(state, visit, today, { importing: true }); imported++; }
    } catch (error) { throw new AppError(`Baris ${line}: ${error.message.replace(/\.$/, '')}.`); }
  }
  return { imported, skipped };
}
