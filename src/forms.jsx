import React, { useState } from 'react';
import { Check, Search, Plus, Save, CalendarDays, Gauge, CircleCheck } from 'lucide-react';
import { COMPONENTS, JOBS, newId, normalize, todayISO } from '../shared/domain.js';
import { Modal, Field, FormError, ComponentIcon, fmtKm } from './components.jsx';
import { PHONE_QUERY } from './mobile.js';

const optional = value => value === null || value === undefined ? '' : String(value);
function Footer({ busy, onClose, text }) {
  return <footer className="form-footer"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" type="submit" disabled={busy}><Save size={18} />{busy ? 'Menyimpan…' : text}</button></footer>;
}
function useSubmission(save) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event, input) { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await save(input); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return { busy, error, submit };
}

export function VehicleForm({ vehicle, onSave, onClose }) {
  const [form, setForm] = useState(() => ({ id: vehicle?.id || newId(), name: vehicle?.name || '', plate: vehicle?.plate || '', odometerKm: optional(vehicle?.odometerKm) }));
  const { busy, error, submit } = useSubmission(onSave);
  const field = key => ({ value: form[key], onChange: event => setForm({ ...form, [key]: event.target.value }) });
  return <Modal title={vehicle ? 'Ubah kendaraan' : 'Tambah kendaraan'} subtitle="Setiap motor punya buku servisnya sendiri." onClose={onClose}>
    <form onSubmit={event => submit(event, form)}><div className="form-body">
      <Field label="Nama kendaraan"><input {...field('name')} autoFocus={!window.matchMedia(PHONE_QUERY).matches} placeholder="Contoh: Vario Biru Tua" required maxLength={80} /></Field>
      <Field label="Pelat nomor" hint="Spasi dan huruf besar tidak membedakan pelat yang sama."><input {...field('plate')} className="plate-input" placeholder="Contoh: W 6299 BY" required maxLength={30} /></Field>
      <Field label={vehicle ? 'Odometer terkini' : 'Odometer awal (opsional)'} hint={vehicle ? `Pembacaan terakhir: ${fmtKm(vehicle.odometerKm)}. Kilometer baru tidak boleh lebih kecil.` : 'Boleh dikosongkan jika belum sempat memeriksa kilometer.'}><div className="input-unit"><input {...field('odometerKm')} type="number" inputMode="numeric" min="0" step="1" placeholder="14500" /><span>km</span></div></Field>
      <FormError error={error} />
    </div><Footer busy={busy} onClose={onClose} text="Simpan kendaraan" /></form>
  </Modal>;
}
export function OdometerForm({ vehicle, onSave, onClose }) {
  const [value, setValue] = useState(optional(vehicle.odometerKm));
  const { busy, error, submit } = useSubmission(onSave);
  return <Modal title="Perbarui kilometer" subtitle={vehicle.name} onClose={onClose}><form onSubmit={event => submit(event, { odometerKm: value })}><div className="form-body">
    <div className="reading-callout"><Gauge size={26} /><div><span>Pembacaan terakhir</span><strong>{fmtKm(vehicle.odometerKm)}</strong></div></div>
    <Field label="Odometer baru" hint="Masukkan pembacaan pada panel motor Anda."><div className="input-unit"><input value={value} onChange={e => setValue(e.target.value)} type="number" inputMode="numeric" min="0" step="1" required autoFocus={!window.matchMedia(PHONE_QUERY).matches} /><span>km</span></div></Field><FormError error={error} />
  </div><Footer busy={busy} onClose={onClose} text="Simpan kilometer" /></form></Modal>;
}
export function ServiceForm({ visit, vehicle, vehicles, onSave, onClose }) {
  const [form, setForm] = useState(() => ({ id: visit?.id || newId(), vehicleId: visit?.vehicleId || vehicle.id, date: visit?.date || todayISO(), jobs: visit?.jobs || [], odometerKm: optional(visit?.odometerKm), costRp: optional(visit?.costRp), workshop: visit?.workshop || '', notes: visit?.notes || '' }));
  const [custom, setCustom] = useState('');
  const { busy, error, submit } = useSubmission(onSave);
  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);
  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const field = key => ({ value: form[key], onChange: event => set(key, event.target.value) });
  const options = [...new Set([...JOBS, ...(visit?.jobs || [])])];
  return <Modal title={visit ? 'Ubah catatan servis' : 'Catat servis'} subtitle="Satu kunjungan, semua pekerjaan tercatat." onClose={onClose} wide>
    <form onSubmit={event => submit(event, { ...form, jobs: [...form.jobs, ...(custom.trim() ? [custom.trim()] : [])] })}><div className="form-body">
      <Field label="Kendaraan"><select {...field('vehicleId')}>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} · {v.plate}</option>)}</select></Field>
      <div className="form-grid"><Field label="Tanggal servis"><input {...field('date')} type="date" required max={todayISO()} /></Field><Field label="Odometer (opsional)" hint={`Saat ini ${fmtKm(selectedVehicle.odometerKm)}. Nota lama boleh lebih kecil.`}><div className="input-unit"><input {...field('odometerKm')} type="number" inputMode="numeric" min="0" step="1" placeholder="14500" /><span>km</span></div></Field></div>
      <fieldset className="jobs-fieldset"><legend>Pekerjaan <span>{form.jobs.length} dipilih</span></legend><div className="job-options">{options.map(job => {
        const checked = form.jobs.includes(job);
        return <label className={`job-option ${checked ? 'selected' : ''}`} key={job}><input type="checkbox" checked={checked} onChange={() => set('jobs', checked ? form.jobs.filter(j => j !== job) : [...form.jobs, job])} /><ComponentIcon name={job} size={21} /><span>{job}</span><span className="job-check" aria-hidden="true">{checked && <Check size={14} />}</span></label>;
      })}</div></fieldset>
      <Field label="Pekerjaan lain (opsional)"><input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Misalnya: setel rantai" maxLength={100} /></Field>
      <div className="form-divider"><span>Rincian kunjungan</span><span>Opsional</span></div>
      <div className="form-grid"><Field label="Total biaya" hint="Kosong = belum diisi. Rp0 berarti gratis."><div className="input-unit prefix"><span>Rp</span><input {...field('costRp')} type="number" inputMode="numeric" min="0" step="1" placeholder="120000" /></div></Field><Field label="Bengkel"><input {...field('workshop')} placeholder="Nama bengkel" maxLength={150} /></Field></div>
      <Field label="Catatan"><textarea {...field('notes')} placeholder="Kondisi motor, merek suku cadang, atau hal yang perlu diingat…" rows={3} maxLength={10000} /></Field>
      <FormError error={error} />
    </div><Footer busy={busy} onClose={onClose} text="Simpan servis" /></form>
  </Modal>;
}
function ComponentPicker({ selected, onUse, onClose }) {
  const [query, setQuery] = useState(''), [choice, setChoice] = useState(selected);
  const options = COMPONENTS.filter(component => normalize(component).includes(normalize(query)));
  return <Modal title="Pilih komponen" subtitle="Apa yang ingin Anda ingatkan?" onClose={onClose}><div className="form-body"><div className="search-input"><Search size={19} /><input autoFocus={!window.matchMedia(PHONE_QUERY).matches} aria-label="Cari komponen" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari komponen" /></div><div className="component-options">{options.map(component => <label className={choice === component ? 'selected' : ''} key={component}><ComponentIcon name={component} size={25} /><span>{component}</span><input type="radio" name="component" value={component} checked={choice === component} onChange={() => setChoice(component)} /></label>)}{!options.length && <p className="muted">Komponen tidak ditemukan.</p>}</div></div><div className="form-footer"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button type="button" className="button primary" disabled={!choice} onClick={() => onUse(choice)}><Check size={18} />Gunakan pilihan</button></div></Modal>;
}
export function ReminderForm({ reminder, vehicle, vehicles, onSave, onClose }) {
  const [form, setForm] = useState(() => ({ id: reminder?.id || newId(), vehicleId: reminder?.vehicleId || vehicle.id, component: reminder?.component || '', targetDate: reminder?.targetDate || '', targetKm: optional(reminder?.targetKm), leadDays: optional(reminder?.leadDays ?? 7), time: reminder?.time || '08:00', active: true }));
  const [picker, setPicker] = useState(false);
  const { busy, error, submit } = useSubmission(onSave);
  const field = key => ({ value: form[key], onChange: event => setForm({ ...form, [key]: event.target.value }) });
  return <><Modal title={reminder ? 'Ubah pengingat' : 'Buat pengingat'} subtitle="Beri perhatian sebelum motor memintanya." onClose={onClose}>
    <form onSubmit={event => submit(event, form)}><div className="form-body">
      <Field label="Kendaraan"><select {...field('vehicleId')}>{vehicles.map(v => <option value={v.id} key={v.id}>{v.name}</option>)}</select></Field>
      <div className="field"><span className="field-label">Komponen / jenis servis</span><button type="button" className="component-select" onClick={() => setPicker(true)}><ComponentIcon name={form.component} size={22} /><span>{form.component || 'Pilih komponen'}</span><Plus size={18} /></button></div>
      <div className="form-grid"><Field label="Tanggal target (opsional)"><input {...field('targetDate')} type="date" /></Field><Field label="Target kilometer (opsional)"><div className="input-unit"><input {...field('targetKm')} type="number" inputMode="numeric" min="0" step="1" placeholder="16500" /><span>km</span></div></Field></div>
      <div className="form-grid"><Field label="Ingatkan lebih awal" hint="0–365 hari sebelum tanggal target."><div className="input-unit"><input {...field('leadDays')} type="number" inputMode="numeric" min="0" max="365" step="1" required /><span>hari</span></div></Field><Field label="Jam pemberitahuan"><input {...field('time')} type="time" required /></Field></div>
      <div className="info-note"><CalendarDays size={20} /><p>Isi tanggal atau kilometer, boleh keduanya. Target yang tercapai lebih dulu menentukan status. Pengingat tetap sama setelah mencatat servis.</p></div><FormError error={error} />
    </div><Footer busy={busy} onClose={onClose} text="Simpan pengingat" /></form>
  </Modal>{picker && <ComponentPicker selected={form.component} onClose={() => setPicker(false)} onUse={component => { setForm({ ...form, component }); setPicker(false); }} />}</>;
}
