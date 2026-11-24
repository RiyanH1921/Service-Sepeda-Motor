export const JOBS = ['Ganti oli mesin', 'Ganti oli gardan', 'Ganti kampas rem', 'Bersihkan filter udara', 'Periksa ban', 'Ganti aki', 'Servis CVT', 'Ganti busi', 'Servis rutin'];
export const COMPONENTS = ['Oli mesin', 'Oli gardan', 'Kampas rem', 'Filter udara', 'Ban', 'Aki', 'CVT', 'Busi'];
export const STATUS = {
  due: { label: 'Jatuh tempo', tone: 'danger' },
  near: { label: 'Mendekati', tone: 'warning' },
  scheduled: { label: 'Terjadwal', tone: 'green' },
  'need-km': { label: 'Perlu data km', tone: 'muted' },
};

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const check = (condition, message, status) => { if (!condition) throw new AppError(message, status); };
export const normalize = value => String(value ?? '').trim().toLocaleLowerCase('id-ID');
export const plateKey = value => String(value ?? '').replace(/\s/g, '').toUpperCase();
export const newId = () => globalThis.crypto.randomUUID();

export function todayISO(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01';
}
export function integer(value, label, optional = true) {
  if (value === '' || value === null || value === undefined) {
    check(optional, `${label} wajib diisi.`);
    return null;
  }
  check((typeof value === 'number' && Number.isSafeInteger(value)) || (typeof value === 'string' && /^\d+$/.test(value.trim())), `${label} harus bilangan bulat 0 atau lebih.`);
  const parsed = Number(value);
  check(Number.isSafeInteger(parsed) && parsed >= 0, `${label} harus bilangan bulat 0 atau lebih dan tidak terlalu besar.`);
  return parsed;
}
export function cleanText(value, label, max = 200, required = false) {
  check(value === undefined || value === null || typeof value === 'string', `${label} tidak valid.`);
  const text = (value ?? '').trim();
  check(!required || text.length > 0, `${label} wajib diisi.`);
  check(text.length <= max, `${label} maksimal ${max} karakter.`);
  return text;
}
const recordId = value => cleanText(value || newId(), 'ID', 200, true);
export const emptyState = () => ({ version: 2, revision: 0, lastCreatedMs: 0, vehicles: [], visits: [], reminders: [], preferences: { profileName: 'Riyan', notifications: false, activeVehicleId: '' } });

export function saveVehicle(state, input) {
  const id = recordId(input.id);
  const existing = state.vehicles.find(v => v.id === id);
  const vehicle = { id, name: cleanText(input.name, 'Nama kendaraan', 80, true), plate: cleanText(input.plate, 'Pelat nomor', 30, true).toUpperCase(), odometerKm: integer(input.odometerKm, 'Odometer') };
  check(plateKey(vehicle.plate).length > 0, 'Pelat nomor wajib diisi.');
  check(!state.vehicles.some(v => v.id !== id && plateKey(v.plate) === plateKey(vehicle.plate)), 'Pelat nomor sudah digunakan kendaraan lain.');
  check(!existing || existing.odometerKm === null || (vehicle.odometerKm !== null && vehicle.odometerKm >= existing.odometerKm), `Pembacaan terakhir ${existing?.odometerKm?.toLocaleString('id-ID')} km. Periksa kembali isian Anda.`);
  if (existing) Object.assign(existing, vehicle); else state.vehicles.push(vehicle);
  if (!state.preferences.activeVehicleId) state.preferences.activeVehicleId = id;
  return vehicle;
}
export function updateOdometer(state, id, value) {
  const vehicle = state.vehicles.find(v => v.id === id);
  check(vehicle, 'Kendaraan tidak ditemukan.', 404);
  return saveVehicle(state, { ...vehicle, odometerKm: integer(value, 'Odometer baru', false) });
}

function validateVisit(state, input, today) {
  check(state.vehicles.some(v => v.id === input.vehicleId), 'Pilih kendaraan yang tersedia.');
  check(validDate(input.date), 'Tanggal servis tidak valid.');
  check(input.date <= today, 'Tanggal servis tidak boleh di masa depan.');
  check(Array.isArray(input.jobs) && input.jobs.length > 0 && input.jobs.length <= 40, 'Pilih sedikitnya satu pekerjaan (maksimal 40).');
  const jobs = input.jobs.map(job => cleanText(job, 'Nama pekerjaan', 100, true));
  const unique = [...new Map(jobs.map(job => [normalize(job), job])).values()];
  return { date: input.date, vehicleId: input.vehicleId, jobs: unique, odometerKm: integer(input.odometerKm, 'Odometer'), costRp: integer(input.costRp, 'Biaya'), workshop: cleanText(input.workshop, 'Nama bengkel', 150), notes: cleanText(input.notes, 'Catatan', 10000) };
}
export function saveVisit(state, input, today = todayISO(), { importing = false } = {}) {
  const id = recordId(input.id);
  const existing = state.visits.find(v => v.id === id);
  const values = validateVisit(state, input, today);
  let createdAt = existing?.createdAt;
  if (importing) {
    check(typeof input.createdAt === 'string' && validDate(input.createdAt.slice(0, 10)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(input.createdAt) && Number.isFinite(Date.parse(input.createdAt)), 'Waktu dibuat harus ISO 8601 dengan zona waktu.');
    createdAt = input.createdAt;
  } else if (!existing) {
    state.lastCreatedMs = Math.max(Date.now(), state.lastCreatedMs + 1);
    createdAt = new Date(state.lastCreatedMs).toISOString();
  }
  const visit = { id, ...values, createdAt };
  if (existing) Object.assign(existing, visit); else state.visits.push(visit);
  const vehicle = state.vehicles.find(v => v.id === visit.vehicleId);
  if (visit.odometerKm !== null && (vehicle.odometerKm === null || visit.odometerKm > vehicle.odometerKm)) vehicle.odometerKm = visit.odometerKm;
  return visit;
}
export function sortedVisits(state, vehicleId, query = '') {
  const q = normalize(query);
  return state.visits.filter(v => (!vehicleId || v.vehicleId === vehicleId) && (!q || normalize(v.workshop).includes(q) || v.jobs.some(job => normalize(job).includes(q))))
    .sort((a, b) => b.date.localeCompare(a.date) || Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));
}

export function reminderStatus(reminder, odometer, today = todayISO()) {
  if ((reminder.targetDate && today >= reminder.targetDate) || (reminder.targetKm !== null && odometer !== null && odometer >= reminder.targetKm)) return 'due';
  if (reminder.targetDate) {
    const start = new Date(`${reminder.targetDate}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - reminder.leadDays);
    if (today >= start.toISOString().slice(0, 10)) return 'near';
  }
  if (reminder.targetKm !== null && odometer === null) return 'need-km';
  return 'scheduled';
}
export function sortedReminders(state, vehicleId, today = todayISO(), includeInactive = false) {
  const km = reminder => state.vehicles.find(v => v.id === reminder.vehicleId)?.odometerKm ?? null;
  return state.reminders.filter(r => (!vehicleId || r.vehicleId === vehicleId) && (includeInactive || r.active)).sort((a, b) => {
    const urgency = r => reminderStatus(r, km(r), today) === 'due' ? 0 : 1;
    const remaining = r => r.targetKm === null || km(r) === null ? Infinity : r.targetKm - km(r);
    return urgency(a) - urgency(b) || (a.targetDate || '9999-12-31').localeCompare(b.targetDate || '9999-12-31') || remaining(a) - remaining(b);
  });
}
export function saveReminder(state, input) {
  const id = recordId(input.id);
  check(state.vehicles.some(v => v.id === input.vehicleId), 'Pilih kendaraan yang tersedia.');
  const existing = state.reminders.find(r => r.id === id);
  const reminder = { id, vehicleId: input.vehicleId, component: cleanText(input.component, 'Komponen', 80, true), targetDate: input.targetDate || null, targetKm: integer(input.targetKm, 'Target kilometer'), leadDays: integer(input.leadDays ?? 7, 'Hari pemberitahuan', false), time: input.time || '08:00', active: input.active !== false, lastNotifiedStatus: existing?.lastNotifiedStatus || '' };
  check(!reminder.targetDate || validDate(reminder.targetDate), 'Tanggal pengingat tidak valid.');
  check(reminder.targetDate || reminder.targetKm !== null, 'Isi sedikitnya satu target: tanggal atau kilometer.');
  check(reminder.leadDays <= 365, 'Pemberitahuan awal maksimal 365 hari.');
  check(typeof reminder.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time), 'Waktu pemberitahuan tidak valid.');
  check(!reminder.active || !state.reminders.some(r => r.id !== id && r.active && r.vehicleId === reminder.vehicleId && normalize(r.component) === normalize(reminder.component)), 'Komponen ini sudah memiliki pengingat aktif. Ubah pengingat yang ada.');
  if (existing && ['targetDate', 'targetKm', 'leadDays', 'time', 'vehicleId', 'component'].some(key => existing[key] !== reminder[key])) reminder.lastNotifiedStatus = '';
  if (existing) Object.assign(existing, reminder); else state.reminders.push(reminder);
  return reminder;
}
export function savePreferences(state, input) {
  if ('profileName' in input) state.preferences.profileName = cleanText(input.profileName, 'Nama profil', 80, true);
  if ('notifications' in input) { check(typeof input.notifications === 'boolean', 'Pilihan notifikasi tidak valid.'); state.preferences.notifications = input.notifications; }
  if ('activeVehicleId' in input) { check(state.vehicles.some(v => v.id === input.activeVehicleId), 'Kendaraan tidak ditemukan.'); state.preferences.activeVehicleId = input.activeVehicleId; }
  return state.preferences;
}

export function claimNotifications(state, now = new Date()) {
  if (!state.preferences.notifications) return [];
  const today = todayISO(now);
  const localTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  const notifications = [];
  for (const reminder of state.reminders.filter(r => r.active)) {
    const vehicle = state.vehicles.find(v => v.id === reminder.vehicleId);
    const status = reminderStatus(reminder, vehicle.odometerKm, today);
    if (!['due', 'near'].includes(status)) { reminder.lastNotifiedStatus = status; continue; }
    const kmDue = reminder.targetKm !== null && vehicle.odometerKm !== null && vehicle.odometerKm >= reminder.targetKm;
    const trigger = reminder.targetDate ? new Date(`${reminder.targetDate}T00:00:00Z`) : null;
    if (trigger && status === 'near') trigger.setUTCDate(trigger.getUTCDate() - reminder.leadDays);
    const triggerDate = trigger?.toISOString().slice(0, 10);
    const timeReached = !triggerDate || today > triggerDate || (today === triggerDate && localTime >= reminder.time);
    if (status !== reminder.lastNotifiedStatus && (kmDue || timeReached)) {
      reminder.lastNotifiedStatus = status;
      notifications.push({ id: reminder.id, vehicleId: vehicle.id, title: `${reminder.component} · ${STATUS[status].label}`, body: `${vehicle.name} — saatnya memeriksa jadwal perawatan.`, status });
    }
  }
  return notifications;
}

export function loadDemo(state, today = todayISO()) {
  check(state.vehicles.length === 0 && state.visits.length === 0, 'Data contoh hanya dapat dimuat saat garasi masih kosong.', 409);
  check(today >= '2026-11-19', 'Data contoh tersedia untuk tanggal perangkat 19 November 2026 atau setelahnya.');
  const vario = saveVehicle(state, { id: newId(), name: 'Vario Biru Tua', plate: 'W 6299 BY', odometerKm: 14500 });
  const fazzio = saveVehicle(state, { id: newId(), name: 'Fazzio Putih', plate: 'W 2841 CK', odometerKm: 3200 });
  saveVisit(state, { vehicleId: vario.id, date: '2026-11-19', jobs: ['Ganti kampas rem', 'Periksa ban'], odometerKm: 14500, costRp: 120000, workshop: 'Bengkel Bintang 99', notes: 'Rem depan sudah lebih pakem. Tekanan ban depan dan belakang sudah disesuaikan.' }, today);
  saveVisit(state, { vehicleId: vario.id, date: '2026-08-10', jobs: ['Ganti oli mesin', 'Bersihkan filter udara'], odometerKm: 12000, costRp: 85000, workshop: 'Bengkel Bintang 99', notes: 'Oli mesin 0,8 liter. Filter udara dibersihkan.' }, today);
  saveVisit(state, { vehicleId: fazzio.id, date: '2026-11-12', jobs: ['Servis rutin', 'Ganti oli mesin'], odometerKm: 3200, costRp: 95000, workshop: 'Yamaha Motor', notes: 'Servis berkala.' }, today);
  saveReminder(state, { vehicleId: vario.id, component: 'Oli mesin', targetDate: '2027-01-18', targetKm: 16500, leadDays: 7 });
  saveReminder(state, { vehicleId: vario.id, component: 'Ban', targetDate: '2027-01-28', leadDays: 3 });
  return { vehicleCount: 2, visitCount: 3 };
}
