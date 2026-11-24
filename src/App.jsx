import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenCheck, House, History, Bell, Settings2, Bike, Plus, Search, ChevronDown, CalendarDays, Gauge, Wrench, Wallet, HardDrive, ShieldCheck, FileDown, FileUp, CircleHelp, Pencil, Check, X, Menu, LoaderCircle, CircleAlert, Eye, RotateCcw, CircleCheck, Power, SlidersHorizontal, Leaf, Smartphone } from 'lucide-react';
import { COMPONENTS, reminderStatus, sortedReminders, sortedVisits, todayISO } from '../shared/domain.js';
import { Modal, Field, FormError, EmptyState, MotorIllustration, ComponentIcon, StatusBadge, fmtDate, fmtMonth, fmtKm, fmtMoney, fmtNumber, initials } from './components.jsx';
import { VehicleForm, OdometerForm, ServiceForm, ReminderForm } from './forms.jsx';
import { usePhoneLayout, useScrollLock } from './mobile.js';
import { version as appVersion } from '../package.json';

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try { response = await fetch(path, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new Error('Server belum terhubung. Pastikan aplikasi Node.js masih berjalan, lalu coba lagi.'); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Permintaan gagal. Silakan coba lagi.');
  return result;
}
const NAV = [
  { id: 'garasi', label: 'Garasi', icon: House },
  { id: 'riwayat', label: 'Riwayat servis', mobile: 'Riwayat', icon: History },
  { id: 'pengingat', label: 'Pengingat', icon: Bell },
  { id: 'kendaraan', label: 'Kendaraan saya', mobile: 'Kendaraan', icon: Bike },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings2 },
];
const getPage = () => { const value = window.location.hash.replace(/^#\/?/, ''); return NAV.some(n => n.id === value) ? value : 'garasi'; };

export default function App() {
  const [state, setState] = useState(null), [connectionError, setConnectionError] = useState('');
  const [page, setPage] = useState(getPage), [modal, setModal] = useState(null), [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false), [query, setQuery] = useState(''), [demoBusy, setDemoBusy] = useState(false);
  const sidebarRef = useRef(null);
  const isPhone = usePhoneLayout();
  useScrollLock(menuOpen && isPhone);
  const closeModal = useCallback(() => setModal(null), []);
  const applyState = useCallback(next => setState(previous => !previous || next.revision >= previous.revision ? next : previous), []);
  const notify = useCallback((message, tone = 'success') => setToast({ message, tone, id: Date.now() }), []);
  const refresh = useCallback(async () => { try { applyState(await request('/api/state')); setConnectionError(''); } catch (e) { setConnectionError(e.message); } }, [applyState]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const handle = () => { setPage(getPage()); setMenuOpen(false); }; window.addEventListener('hashchange', handle); return () => window.removeEventListener('hashchange', handle); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    if (!menuOpen || !isPhone) return;
    const previous = document.activeElement;
    const sidebar = sidebarRef.current;
    sidebar.querySelector('button')?.focus();
    const keys = event => {
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); }
      if (event.key !== 'Tab') return;
      const items = [...sidebar.querySelectorAll('a, button')].filter(item => item.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    sidebar.addEventListener('keydown', keys);
    return () => { sidebar.removeEventListener('keydown', keys); previous?.focus(); };
  }, [menuOpen, isPhone]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5500); return () => clearTimeout(timer); }, [toast]);

  const checkNotifications = useCallback(async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const result = await request('/api/notifications/claim', { method: 'POST', body: {} });
      if (!result.result.length) return;
      applyState(result.state);
      for (const item of result.result) {
        const notification = new Notification(item.title, { body: item.body, icon: '/favicon.svg', tag: item.id });
        notification.onclick = async () => {
          window.focus(); window.location.hash = 'pengingat';
          try { const changed = await request('/api/preferences', { method: 'PUT', body: { activeVehicleId: item.vehicleId } }); applyState(changed.state); const reminder = changed.state.reminders.find(r => r.id === item.id); if (reminder) setModal({ type: 'reminder', reminder }); } catch (e) { notify(e.message, 'error'); }
          notification.close();
        };
      }
    } catch (e) { notify(e.message, 'error'); }
  }, [applyState, notify]);
  useEffect(() => {
    if (!state?.preferences.notifications) return;
    checkNotifications();
    const timer = setInterval(checkNotifications, 60000);
    return () => clearInterval(timer);
  }, [state?.preferences.notifications, checkNotifications]);
  useEffect(() => { const timer = setInterval(refresh, 60000); const focus = () => refresh(); window.addEventListener('focus', focus); return () => { clearInterval(timer); window.removeEventListener('focus', focus); }; }, [refresh]);

  const mutate = useCallback(async (path, body, message, method = 'POST') => {
    const result = await request(path, { method, body });
    applyState(result.state); setConnectionError('');
    if (message) notify(message);
    if (result.state.preferences.notifications && path !== '/api/preferences') checkNotifications();
    return result;
  }, [applyState, notify, checkNotifications]);
  const action = async operation => { try { await operation(); } catch (e) { notify(e.message, 'error'); } };
  const vehicle = state?.vehicles.find(v => v.id === state.preferences.activeVehicleId) || state?.vehicles[0];
  const visits = useMemo(() => state && vehicle ? sortedVisits(state, vehicle.id) : [], [state, vehicle]);
  const reminders = useMemo(() => state && vehicle ? sortedReminders(state, vehicle.id) : [], [state, vehicle]);
  const dueCount = state ? state.reminders.filter(r => r.active && reminderStatus(r, state.vehicles.find(v => v.id === r.vehicleId)?.odometerKm ?? null) === 'due').length : 0;
  const navigate = next => { window.location.hash = next; setMenuOpen(false); };
  const selectVehicle = id => action(() => mutate('/api/preferences', { activeVehicleId: id }, null, 'PUT'));
  const openService = () => vehicle ? setModal({ type: 'service' }) : setModal({ type: 'vehicle' });
  const openReminder = () => vehicle ? setModal({ type: 'reminder' }) : setModal({ type: 'vehicle' });
  const openHelp = () => setModal({ type: 'help' });
  const loadExample = async () => { setDemoBusy(true); try { await mutate('/api/demo', {}, 'Data contoh siap: 2 kendaraan dan 3 kunjungan servis.'); } catch (e) { notify(e.message, 'error'); } finally { setDemoBusy(false); } };

  return <div className="app-shell">
    {menuOpen && <button className="sidebar-backdrop" aria-label="Tutup menu samping" onClick={() => setMenuOpen(false)} />}
    <aside ref={sidebarRef} className={`sidebar ${menuOpen ? 'open' : ''}`} inert={isPhone && !menuOpen ? true : undefined}>
      <button className="icon-button drawer-close" aria-label="Tutup navigasi" onClick={() => setMenuOpen(false)}><X size={22} /></button>
      <a className="brand" href="#garasi" aria-label="Buku Servis, buka Garasi"><span className="brand-icon"><BookOpenCheck size={26} strokeWidth={1.7} /></span><span>Buku Servis<small>CATAT. RAWAT. JALAN.</small></span></a>
      <div className="sidebar-label">GARASI PRIBADI</div>
      <nav className="desktop-nav" aria-label="Navigasi utama">{NAV.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => setMenuOpen(false)}><Icon size={20} strokeWidth={1.8} /><span>{label}</span>{id === 'pengingat' && dueCount > 0 && <span className="nav-count">{dueCount}</span>}{id === 'kendaraan' && !!state?.vehicles.length && <span className="vehicle-nav-count">{state.vehicles.length}</span>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="local-card"><span className="local-icon"><ShieldCheck size={22} /></span><strong>Garasi selalu bersama Anda.</strong><p>Catatan servis tersimpan di komputer ini.</p><span className="local-label"><HardDrive size={13} /> Penyimpanan lokal</span></div><button className="sidebar-help" onClick={openHelp}><CircleHelp size={18} />Panduan penggunaan</button><div className="profile"><span className="avatar">{initials(state?.preferences.profileName || 'Riyan')}</span><div><strong>{state?.preferences.profileName || 'Riyan'}</strong><span>Pemilik garasi</span></div><button className="icon-button" aria-label="Buka pengaturan profil" onClick={() => navigate('pengaturan')}><Settings2 size={18} /></button></div></div>
    </aside>
    <div className="workspace" inert={menuOpen && isPhone ? true : undefined}>
      <header className="topbar"><div className="breadcrumb"><button className="icon-button menu-toggle" aria-label="Buka navigasi" onClick={() => setMenuOpen(true)}><Menu size={23} /></button><span className="mobile-app-brand"><BookOpenCheck size={23} />Buku Servis</span><span className="breadcrumb-home">Garasi pribadi</span><span className="breadcrumb-separator">/</span><strong>{NAV.find(n => n.id === page)?.label}</strong></div><div className="topbar-actions"><a className="device-preview-link" href="?mode=android"><Smartphone size={17} />Mode Android</a><span className="today"><CalendarDays size={16} />{fmtDate(todayISO(), true)}</span><span className="topbar-divider" /><button className="icon-button notification-button" aria-label={dueCount ? `${dueCount} pengingat jatuh tempo` : 'Buka pengingat'} onClick={() => navigate('pengingat')}><Bell size={20} />{dueCount > 0 && <span />}</button><button className="mini-avatar" aria-label="Buka pengaturan" onClick={() => navigate('pengaturan')}>{initials(state?.preferences.profileName || 'Riyan')}</button></div></header>
      <main id="main-content" className="main-content">
        {connectionError && <div className="connection-error" role="alert"><CircleAlert size={20} /><span>{connectionError}</span><button onClick={refresh}>Coba lagi</button></div>}
        {!state ? <div className="loading-state"><LoaderCircle size={30} className="spin" /><h2>{connectionError ? 'Hubungkan kembali garasi Anda' : 'Membuka garasi Anda…'}</h2><p>Menyiapkan catatan perawatan motor.</p></div> : <>
          {page === 'garasi' && (vehicle ? <Garage state={state} vehicle={vehicle} visits={visits} reminders={reminders} selectVehicle={selectVehicle} openService={openService} openReminder={openReminder} onDetail={visit => setModal({ type: 'detail', visit })} onReminder={reminder => setModal({ type: 'reminder', reminder })} navigate={navigate} /> : <Welcome profile={state.preferences.profileName} onAdd={() => setModal({ type: 'vehicle' })} onExample={loadExample} busy={demoBusy} />)}
          {page === 'riwayat' && <HistoryPage state={state} vehicle={vehicle} selectVehicle={selectVehicle} query={query} setQuery={setQuery} onAdd={openService} onDetail={visit => setModal({ type: 'detail', visit })} />}
          {page === 'pengingat' && <RemindersPage state={state} vehicle={vehicle} selectVehicle={selectVehicle} onAdd={openReminder} onEdit={reminder => setModal({ type: 'reminder', reminder })} onToggle={reminder => action(() => mutate(`/api/reminders/${encodeURIComponent(reminder.id)}`, { ...reminder, active: !reminder.active }, reminder.active ? 'Pengingat dinonaktifkan.' : 'Pengingat diaktifkan.', 'PUT'))} />}
          {page === 'kendaraan' && <VehiclesPage state={state} onAdd={() => setModal({ type: 'vehicle' })} onEdit={vehicle => setModal({ type: 'vehicle', vehicle })} onOdometer={vehicle => setModal({ type: 'odometer', vehicle })} selectVehicle={id => action(() => mutate('/api/preferences', { activeVehicleId: id }, 'Kendaraan aktif diperbarui.', 'PUT'))} />}
          {page === 'pengaturan' && <SettingsPage state={state} mutate={mutate} notify={notify} onHelp={openHelp} />}
          <footer className="page-footer"><span>Buku Servis <span className="footer-dot">·</span> Perawatan kecil, perjalanan lebih tenang.</span><span><HardDrive size={13} />Tersimpan lokal</span></footer>
        </>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Navigasi ponsel" inert={menuOpen && isPhone ? true : undefined}>{NAV.filter(item => ['garasi', 'riwayat', 'pengingat'].includes(item.id)).map(({ id, label, mobile, icon: Icon }) => <a key={id} href={`#${id}`} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined}><Icon size={20} /><span>{mobile || label}</span></a>)}</nav>
    {toast && <div key={toast.id} className={`toast ${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>{toast.tone === 'error' ? <CircleAlert size={20} /> : <CircleCheck size={20} />}<span>{toast.message}</span><button aria-label="Tutup pesan" onClick={() => setToast(null)}><X size={17} /></button></div>}
    {modal?.type === 'vehicle' && <VehicleForm vehicle={modal.vehicle} onClose={closeModal} onSave={async form => { await mutate(modal.vehicle ? `/api/vehicles/${encodeURIComponent(form.id)}` : '/api/vehicles', form, 'Kendaraan berhasil disimpan.', modal.vehicle ? 'PUT' : 'POST'); closeModal(); }} />}
    {modal?.type === 'odometer' && <OdometerForm vehicle={modal.vehicle} onClose={closeModal} onSave={async form => { await mutate(`/api/vehicles/${encodeURIComponent(modal.vehicle.id)}/odometer`, form, 'Kilometer diperbarui. Status pengingat sudah diperiksa.', 'PUT'); closeModal(); }} />}
    {modal?.type === 'service' && vehicle && <ServiceForm visit={modal.visit} vehicle={vehicle} vehicles={state.vehicles} onClose={closeModal} onSave={async form => { await mutate(modal.visit ? `/api/visits/${encodeURIComponent(form.id)}` : '/api/visits', form, 'Catatan servis berhasil disimpan.', modal.visit ? 'PUT' : 'POST'); closeModal(); }} />}
    {modal?.type === 'detail' && <ServiceDetail visit={state.visits.find(v => v.id === modal.visit.id) || modal.visit} vehicle={state.vehicles.find(v => v.id === modal.visit.vehicleId)} onClose={closeModal} onEdit={() => setModal({ type: 'service', visit: modal.visit })} />}
    {modal?.type === 'reminder' && vehicle && <ReminderForm reminder={modal.reminder} vehicle={vehicle} vehicles={state.vehicles} onClose={closeModal} onSave={async form => { await mutate(modal.reminder ? `/api/reminders/${encodeURIComponent(form.id)}` : '/api/reminders', form, 'Pengingat berhasil disimpan.', modal.reminder ? 'PUT' : 'POST'); closeModal(); }} />}
    {modal?.type === 'help' && <Help onClose={closeModal} />}
  </div>;
}

function PageHeading({ eyebrow, title, description, children }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{children && <div className="heading-actions">{children}</div>}</div>;
}
function VehicleSelect({ state, vehicle, selectVehicle }) {
  return <div className="vehicle-select"><Bike size={20} /><select aria-label="Kendaraan aktif" value={vehicle?.id || ''} onChange={e => selectVehicle(e.target.value)} disabled={!state.vehicles.length}>{!state.vehicles.length && <option value="">Belum ada kendaraan</option>}{state.vehicles.map(v => <option value={v.id} key={v.id}>{v.name}</option>)}</select><ChevronDown size={16} /></div>;
}
function Welcome({ profile, onAdd, onExample, busy }) {
  return <>
    <PageHeading eyebrow="SELAMAT DATANG DI GARASI" title={`Halo, ${profile}.`} description="Mulai kebiasaan baik untuk motor kesayangan Anda." />
    <section className="welcome-hero"><div><span className="hero-eyebrow"><Leaf size={16} />MOTOR TERAWAT, HATI TENANG</span><h2>Setiap perjalanan baik<br />dimulai dari <em>perawatan.</em></h2><p>Simpan setiap kunjungan bengkel, temukan servis terakhir, dan ingat kapan saatnya merawat motor lagi.</p><div className="welcome-actions"><button className="button primary" onClick={onAdd}><Plus size={20} />Tambah kendaraan</button><button className="button text-button" onClick={onExample} disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <BookOpenCheck size={18} />}{busy ? 'Menyiapkan contoh…' : 'Coba data contoh'}</button></div><span className="welcome-note">Belum ingin mengisi? Data contoh membantu Anda mencoba semua halaman.</span></div><div className="welcome-art"><div className="art-orbit" /><MotorIllustration /><span className="art-caption"><CircleCheck size={16} />Rumah untuk catatan servis Anda</span></div></section>
    <div className="welcome-features">{[{ icon: History, title: 'Catatan yang mudah dicari', text: 'Ingat kapan terakhir ganti oli, tanpa membongkar nota lama.' }, { icon: Bell, title: 'Perawatan tepat waktu', text: 'Atur pengingat berdasarkan tanggal atau kilometer motor.' }, { icon: ShieldCheck, title: 'Tersimpan di komputer Anda', text: 'Tetap bisa digunakan tanpa internet. Ekspor riwayat kapan saja.' }].map(({ icon: Icon, title, text }) => <div key={title}><span><Icon size={23} /></span><h3>{title}</h3><p>{text}</p></div>)}</div>
  </>;
}
function Garage({ state, vehicle, visits, reminders, selectVehicle, openService, openReminder, onDetail, onReminder, navigate }) {
  const latest = visits[0];
  const costs = visits.filter(v => v.costRp !== null);
  const total = costs.reduce((sum, v) => sum + v.costRp, 0);
  return <div className="garage-page">
    <PageHeading eyebrow="SEDIKIT PERHATIAN, BANYAK KETENANGAN" title={`Garasi ${state.preferences.profileName}`} description="Semua yang perlu Anda ingat tentang motor kesayangan."><button className="button primary" onClick={openService}><Plus size={19} />Catat servis</button></PageHeading>
    <section className="garage-hero"><div className="hero-copy"><span className="hero-eyebrow"><span className="hero-marker" />KENDARAAN AKTIF</span><VehicleSelect state={state} vehicle={vehicle} selectVehicle={selectVehicle} /><span className="plate-tag">{vehicle.plate}</span><div className="mobile-current-km"><Gauge size={16} /><span>{fmtKm(vehicle.odometerKm)}</span></div><h2>Siap menemani<br /><em>perjalanan berikutnya.</em></h2><p>Motor terawat dimulai dari catatan yang rapi.</p><button className="text-link" onClick={() => navigate('kendaraan')}><Gauge size={16} />Perbarui kilometer motor</button></div><div className="garage-art"><div className="art-orbit" /><MotorIllustration color={state.vehicles.findIndex(v => v.id === vehicle.id) % 2 ? '#778270' : '#204f46'} /><span className="motor-label">YOUR EVERYDAY COMPANION</span></div></section>
    <div className="stats-grid"><Stat icon={History} label="Kunjungan servis" value={fmtNumber(visits.length)} detail="Semua catatan kendaraan ini" /><Stat icon={Gauge} label="Odometer terkini" value={vehicle.odometerKm === null ? 'Belum diisi' : fmtNumber(vehicle.odometerKm)} suffix={vehicle.odometerKm === null ? '' : 'km'} detail="Pembacaan terakhir yang dicatat" /><Stat icon={Wallet} label="Total biaya tercatat" value={costs.length ? fmtMoney(total) : 'Belum diisi'} detail={costs.length ? `Dari ${costs.length} kunjungan dengan biaya` : 'Lengkapi biaya saat mencatat servis'} /></div>
    <div className="dashboard-grid"><section className={`latest-card ${!latest ? 'latest-empty' : ''}`}>
      <Wrench className="latest-watermark" size={180} strokeWidth={1} /><div className="latest-label"><span className="latest-icon"><Wrench size={20} /></span><span>Servis terakhir</span><span className="latest-overline">KUNJUNGAN TERBARU</span></div>
      {latest ? <><h2>{fmtDate(latest.date, true)}</h2><div className="latest-jobs">{latest.jobs.map(job => <span key={job}><Check size={15} />{job}</span>)}</div><div className="latest-bottom"><span><Gauge size={17} />{fmtKm(latest.odometerKm)}</span><button onClick={() => onDetail(latest)}>Lihat detail<Eye size={16} /></button></div></> : <><h2>Belum ada servis tercatat.</h2><p>Catat kunjungan bengkel pertama motor Anda.</p><button className="button light" onClick={openService}><Plus size={18} />Catat servis pertama</button></>}
    </section><section className="panel upcoming-panel"><div className="section-heading"><h2><Bell size={19} />Pengingat terdekat</h2><button className="text-link" onClick={() => navigate('pengingat')}>Lihat semua</button></div>{reminders.length ? <div className="upcoming-list">{reminders.slice(0, 2).map(r => <button className="upcoming-item" key={r.id} onClick={() => onReminder(r)}><span className="component-icon"><ComponentIcon name={r.component} size={24} /></span><span className="upcoming-copy"><strong>{r.component}</strong><span>{r.targetDate ? fmtDate(r.targetDate) : fmtKm(r.targetKm)}</span></span><StatusBadge status={reminderStatus(r, vehicle.odometerKm)} /></button>)}</div> : <div className="upcoming-empty"><div><Bell size={27} /></div><h3>Jangan tunggu sampai lupa.</h3><p>Atur pengingat untuk perawatan berikutnya.</p><button className="button secondary small" onClick={openReminder}><Plus size={16} />Buat pengingat</button></div>}<div className="panel-footnote"><CircleCheck size={15} />Rawat sebelum ada keluhan.</div></section></div>
    <section className="panel recent-panel"><div className="section-heading"><div><h2>Catatan terbaru</h2><p>Setiap perawatan, tersimpan dengan baik.</p></div><button className="button secondary small" onClick={() => navigate('riwayat')}><History size={16} />Semua riwayat</button></div>{visits.length ? <><div className="mobile-recent-list">{visits.slice(0, 3).map(visit => <button className="mobile-recent-item" key={visit.id} onClick={() => onDetail(visit)}><span className="mobile-recent-date"><CalendarDays size={17} />{fmtDate(visit.date)}</span><span className="mobile-recent-copy"><strong>{visit.jobs[0]}</strong><span>{visit.jobs.length > 1 ? `+${visit.jobs.length - 1} pekerjaan · ` : ''}{visit.workshop || 'Bengkel belum diisi'}</span></span><span className="mobile-recent-cost">{fmtMoney(visit.costRp)}<Eye size={17} /></span></button>)}</div><div className="table-scroll"><table><thead><tr><th>TANGGAL SERVIS</th><th>PEKERJAAN</th><th>BENGKEL</th><th>BIAYA</th><th><span className="sr-only">Detail</span></th></tr></thead><tbody>{visits.slice(0, 3).map(visit => <tr key={visit.id} onClick={() => onDetail(visit)}><td className="table-date">{fmtDate(visit.date)}</td><td><strong>{visit.jobs[0]}</strong>{visit.jobs.length > 1 && <span className="more-jobs">+{visit.jobs.length - 1} pekerjaan</span>}</td><td>{visit.workshop || 'Belum diisi'}</td><td className="table-cost">{fmtMoney(visit.costRp)}</td><td><button className="icon-button" aria-label={`Detail servis ${fmtDate(visit.date)}`} onClick={e => { e.stopPropagation(); onDetail(visit); }}><Eye size={17} /></button></td></tr>)}</tbody></table></div></> : <EmptyState compact title="Cerita perawatan dimulai di sini" description="Catatan yang Anda simpan akan muncul di bagian ini." />}</section>
  </div>;
}
function Stat({ icon: Icon, label, value, suffix, detail }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={18} /></div><strong>{value}{suffix && <small>{suffix}</small>}</strong><span className="stat-detail">{detail}</span></div>;
}
function HistoryPage({ state, vehicle, selectVehicle, query, setQuery, onAdd, onDetail }) {
  const [shown, setShown] = useState(30);
  const visits = useMemo(() => vehicle ? sortedVisits(state, vehicle.id, query) : [], [state, vehicle, query]);
  useEffect(() => setShown(30), [query, vehicle?.id]);
  const groups = new Map();
  visits.slice(0, shown).forEach(visit => { const month = visit.date.slice(0, 7); if (!groups.has(month)) groups.set(month, []); groups.get(month).push(visit); });
  return <><PageHeading eyebrow="CATATAN PERAWATAN" title="Riwayat servis" description="Cari pekerjaan, temukan tanggalnya. Semudah itu."><button className="button primary" onClick={onAdd}><Plus size={19} />Catat servis</button></PageHeading><div className="history-toolbar"><VehicleSelect state={state} vehicle={vehicle} selectVehicle={selectVehicle} /><div className="search-input"><Search size={20} /><input aria-label="Cari pekerjaan atau bengkel" placeholder="Cari pekerjaan atau bengkel…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Hapus pencarian" onClick={() => setQuery('')}><X size={17} /></button>}</div></div><div className="results-summary"><span>{query ? `Hasil pencarian “${query}”` : 'Semua kunjungan'}</span><span>{visits.length} catatan servis</span></div>
    {!visits.length ? <div className="panel"><EmptyState title={!vehicle ? 'Tambahkan kendaraan pertama Anda' : query ? 'Servis tidak ditemukan' : 'Belum ada servis tercatat'} description={query ? 'Coba kata kunci pekerjaan atau nama bengkel yang lain.' : 'Setelah mencatat servis, semua kunjungan bisa Anda temukan di sini.'}>{query ? <button className="button secondary" onClick={() => setQuery('')}>Hapus pencarian</button> : <button className="button primary" onClick={onAdd}><Plus size={18} />{vehicle ? 'Catat servis' : 'Tambah kendaraan'}</button>}</EmptyState></div> : <div className="timeline">{[...groups.entries()].map(([month, records]) => <section className="timeline-month" key={month}><div className="month-label"><span /><h2>{fmtMonth(`${month}-01`)}</h2><span className="month-count">{records.length} kunjungan</span></div><div className="timeline-records">{records.map(visit => <button className="history-card" key={visit.id} onClick={() => onDetail(visit)}><span className="timeline-dot" /><span className="history-date"><span>{new Date(`${visit.date}T12:00:00+07:00`).getDate()}</span><span>{new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${visit.date}T12:00:00+07:00`))}</span></span><span className="history-info"><strong>{visit.jobs.join(' · ')}</strong><span><Gauge size={15} />{fmtKm(visit.odometerKm)}<span className="separator-dot">·</span>{visit.workshop || 'Bengkel belum diisi'}</span></span><span className="history-price">{fmtMoney(visit.costRp)}<small>Lihat detail</small></span><Eye size={19} className="history-eye" /></button>)}</div></section>)}</div>}{visits.length > shown && <div className="load-more"><button className="button secondary" onClick={() => setShown(shown + 30)}>Tampilkan 30 berikutnya</button></div>}
  </>;
}
function RemindersPage({ state, vehicle, selectVehicle, onAdd, onEdit, onToggle }) {
  const [filter, setFilter] = useState('active');
  const all = vehicle ? sortedReminders(state, vehicle.id, todayISO(), true) : [];
  const active = all.filter(r => r.active);
  const records = all.filter(r => filter === 'inactive' ? !r.active : r.active && (filter !== 'due' || reminderStatus(r, vehicle.odometerKm) === 'due'));
  return <><PageHeading eyebrow="RENCANAKAN PERAWATAN" title="Pengingat servis" description="Lebih baik diingatkan hari ini, daripada lupa besok."><button className="button primary" onClick={onAdd}><Plus size={19} />Tambah pengingat</button></PageHeading><div className="reminder-toolbar"><VehicleSelect state={state} vehicle={vehicle} selectVehicle={selectVehicle} /><div className="segmented-control" aria-label="Filter pengingat">{[['active', 'Aktif', active.length], ['due', 'Jatuh tempo', active.filter(r => reminderStatus(r, vehicle?.odometerKm) === 'due').length], ['inactive', 'Nonaktif', all.length - active.length]].map(([value, label, count]) => <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}</div></div>
    {!records.length ? <div className="panel"><EmptyState title={filter === 'due' ? 'Belum ada yang jatuh tempo' : filter === 'inactive' ? 'Tidak ada pengingat nonaktif' : 'Buat ruang untuk perawatan berikutnya'} description={filter === 'active' ? 'Pilih komponen, atur tanggal atau kilometer, lalu biarkan catatan membantu Anda mengingat.' : 'Pengingat motor Anda akan tampil di sini sesuai statusnya.'}>{filter === 'active' && <button className="button primary" onClick={onAdd}><Plus size={18} />{vehicle ? 'Buat pengingat' : 'Tambah kendaraan'}</button>}</EmptyState></div> : <div className="reminders-grid">{records.map(r => {
      const status = reminderStatus(r, vehicle.odometerKm);
      const remaining = r.targetKm !== null && vehicle.odometerKm !== null ? Math.max(0, r.targetKm - vehicle.odometerKm) : null;
      return <article className={`reminder-card ${status === 'due' && r.active ? 'is-due' : ''}`} key={r.id}><div className="reminder-card-top"><span className="component-icon large"><ComponentIcon name={r.component} size={28} /></span><StatusBadge status={status} inactive={!r.active} /></div><h2>{r.component}</h2><p className="reminder-vehicle">{vehicle.name}</p><div className="reminder-targets">{r.targetDate && <div><CalendarDays size={18} /><span><small>Tanggal target</small><strong>{fmtDate(r.targetDate, true)}</strong></span></div>}{r.targetKm !== null && <div><Gauge size={18} /><span><small>Target odometer</small><strong>{fmtKm(r.targetKm)}</strong></span>{remaining !== null && <span className="remaining-km">{remaining ? `${fmtNumber(remaining)} km lagi` : 'Target tercapai'}</span>}</div>}</div>{r.targetKm !== null && vehicle.odometerKm !== null && <div className="km-progress"><span style={{ width: `${r.targetKm ? Math.min(100, vehicle.odometerKm / r.targetKm * 100) : 100}%` }} /></div>}<p className="reminder-advance"><Bell size={14} />{r.targetDate ? `${r.leadDays} hari sebelumnya, pukul ${r.time}` : 'Diperiksa saat kilometer diperbarui'}</p><div className="reminder-actions"><button onClick={() => onEdit(r)}><Pencil size={16} />Ubah pengingat</button><button onClick={() => onToggle(r)}><Power size={15} />{r.active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></article>;
    })}</div>}
    <div className="gentle-note"><CircleHelp size={18} /><span>Status mengikuti tanggal atau kilometer yang tercapai lebih dulu. Notifikasi browser muncul selama aplikasi terbuka.</span></div>
  </>;
}
function VehiclesPage({ state, onAdd, onEdit, onOdometer, selectVehicle }) {
  return <><PageHeading eyebrow="KENALI MOTOR ANDA" title="Kendaraan saya" description="Tempat setiap motor memiliki catatan perawatannya sendiri."><button className="button primary" onClick={onAdd}><Plus size={19} />Tambah kendaraan</button></PageHeading>{!state.vehicles.length ? <div className="panel"><EmptyState title="Garasi Anda masih kosong" description="Tambahkan nama, pelat, dan kilometer motor untuk mulai mencatat servis."><button className="button primary" onClick={onAdd}><Plus size={18} />Tambah kendaraan</button></EmptyState></div> : <div className="vehicles-grid">{state.vehicles.map((vehicle, index) => {
    const active = vehicle.id === state.preferences.activeVehicleId, records = sortedVisits(state, vehicle.id);
    return <article className={`vehicle-card ${active ? 'selected' : ''}`} key={vehicle.id}><div className="vehicle-card-top"><span className={active ? 'active-vehicle-badge' : 'inactive-vehicle-badge'}>{active ? <CircleCheck size={15} /> : <Bike size={15} />}{active ? 'Kendaraan aktif' : 'Kendaraan saya'}</span><button className="icon-button" aria-label={`Ubah ${vehicle.name}`} onClick={() => onEdit(vehicle)}><Pencil size={18} /></button></div><h2>{vehicle.name}</h2><span className="plate-tag">{vehicle.plate}</span><MotorIllustration color={index % 2 ? '#778270' : '#204f46'} /><div className="vehicle-reading"><Gauge size={20} /><strong>{fmtKm(vehicle.odometerKm)}</strong><span>{records.length} kunjungan</span></div><div className="vehicle-last"><span>Servis terakhir</span><strong>{records.length ? fmtDate(records[0].date) : 'Belum ada catatan'}</strong></div><div className="vehicle-card-actions"><button className={`button ${active ? 'primary' : 'secondary'}`} onClick={() => active ? onOdometer(vehicle) : selectVehicle(vehicle.id)}>{active ? <Gauge size={17} /> : <Check size={17} />}{active ? 'Perbarui kilometer' : 'Gunakan kendaraan'}</button>{!active && <button className="icon-button" aria-label={`Perbarui kilometer ${vehicle.name}`} onClick={() => onOdometer(vehicle)}><Gauge size={19} /></button>}</div></article>;
  })}<button className="add-vehicle-card" onClick={onAdd}><span><Plus size={29} /></span><strong>Tempat untuk motor berikutnya</strong><p>Tambahkan kendaraan ke garasi Anda.</p></button></div>}</>;
}
function ServiceDetail({ visit, vehicle, onClose, onEdit }) {
  return <Modal title="Detail servis" subtitle="Rincian satu kunjungan bengkel." onClose={onClose}><div className="detail-body"><div className="detail-date"><span><CalendarDays size={25} /></span><div><small>TANGGAL SERVIS</small><h3>{fmtDate(visit.date, true)}</h3></div></div><div className="detail-vehicle"><Bike size={20} /><strong>{vehicle?.name}</strong><span>{vehicle?.plate}</span></div><div className="detail-section"><h4>Pekerjaan yang dilakukan</h4><div className="detail-jobs">{visit.jobs.map(job => <div key={job}><span><ComponentIcon name={job} size={20} /></span>{job}<CircleCheck size={17} /></div>)}</div></div><div className="detail-values"><div><span>Odometer</span><strong>{fmtKm(visit.odometerKm)}</strong></div><div><span>Bengkel</span><strong>{visit.workshop || 'Belum diisi'}</strong></div></div><div className="detail-total"><span>Total biaya{visit.costRp === 0 && <small>Gratis</small>}</span><strong>{fmtMoney(visit.costRp)}</strong></div><div className="detail-section"><h4>Catatan</h4><p className="detail-notes">{visit.notes || 'Belum diisi'}</p></div></div><div className="form-footer"><button className="button secondary" onClick={onClose}>Tutup</button><button className="button primary" onClick={onEdit}><Pencil size={17} />Ubah catatan</button></div></Modal>;
}
function SettingsPage({ state, mutate, notify, onHelp }) {
  const [name, setName] = useState(state.preferences.profileName), [busyProfile, setBusyProfile] = useState(false), [error, setError] = useState('');
  const [fileBusy, setFileBusy] = useState(''), [permissionBusy, setPermissionBusy] = useState(false), [importResult, setImportResult] = useState(null);
  const fileInput = useRef(null);
  const supported = 'Notification' in window;
  const permission = supported ? Notification.permission : 'unavailable';
  async function profile(event) { event.preventDefault(); setBusyProfile(true); setError(''); try { await mutate('/api/preferences', { profileName: name }, 'Nama profil disimpan.', 'PUT'); } catch (e) { setError(e.message); } finally { setBusyProfile(false); } }
  async function notifications() {
    setPermissionBusy(true);
    try {
      if (state.preferences.notifications) await mutate('/api/preferences', { notifications: false }, 'Notifikasi dimatikan. Pengingat tetap tersimpan.', 'PUT');
      else if (!supported) notify('Browser ini belum mendukung notifikasi.', 'error');
      else { const result = await Notification.requestPermission(); if (result === 'granted') await mutate('/api/preferences', { notifications: true }, 'Notifikasi browser diaktifkan.', 'PUT'); else notify('Izin notifikasi belum diberikan. Daftar pengingat tetap bisa digunakan.', 'error'); }
    } catch (e) { notify(e.message, 'error'); } finally { setPermissionBusy(false); }
  }
  async function exportFile() {
    setFileBusy('export');
    try {
      const response = await fetch('/api/export');
      if (!response.ok) throw new Error('Ekspor gagal. Periksa koneksi ke server lokal.');
      const blob = await response.blob(), filename = `buku-servis-${todayISO()}.csv`;
      if (typeof window.showSaveFilePicker === 'function') {
        const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'Riwayat servis CSV', accept: { 'text/csv': ['.csv'] } }] });
        const writable = await handle.createWritable(); await writable.write(blob); await writable.close();
      } else { const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
      notify(`${response.headers.get('X-Visit-Count')} kunjungan berhasil diekspor.`);
    } catch (e) { if (e.name !== 'AbortError') notify(e.message, 'error'); } finally { setFileBusy(''); }
  }
  async function importFile(event) {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    setFileBusy('import'); setImportResult(null);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Ukuran berkas CSV maksimal 20 MB.');
      let csv; try { csv = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); } catch { throw new Error('Berkas harus menggunakan format teks UTF-8.'); }
      const response = await mutate('/api/import', { csv }, null);
      const message = `${response.result.imported} kunjungan diimpor, ${response.result.skipped} kunjungan identik dilewati.`;
      setImportResult({ message, success: true }); notify(message);
    } catch (e) { setImportResult({ message: e.message, success: false }); notify('Impor dibatalkan. Data sebelumnya tetap utuh.', 'error'); } finally { setFileBusy(''); }
  }
  return <><PageHeading eyebrow="SESUAI KEBUTUHAN ANDA" title="Pengaturan" description="Kelola profil, pengingat, dan salinan catatan servis Anda." /><div className="settings-layout"><div className="settings-main"><section className="panel settings-section"><div className="section-heading"><h2>Profil garasi</h2><span className="subtle-tag">Profil lokal</span></div><form className="profile-form" onSubmit={profile}><span className="profile-avatar-large">{initials(state.preferences.profileName)}</span><Field label="Nama pemilik garasi"><input value={name} onChange={e => setName(e.target.value)} required maxLength={80} /></Field><button className="button secondary" disabled={busyProfile}>{busyProfile ? 'Menyimpan…' : 'Simpan nama'}</button><FormError error={error} /></form></section><section className="panel settings-section"><div className="section-heading"><h2>Pengingat & notifikasi</h2><Bell size={21} /></div><div className="notification-setting"><div><strong>Notifikasi servis</strong><p>Dapatkan pemberitahuan saat target perawatan mendekati atau jatuh tempo.</p></div><button className={`switch ${state.preferences.notifications ? 'on' : ''}`} role="switch" aria-label="Notifikasi servis" aria-checked={state.preferences.notifications} disabled={permissionBusy || !supported} onClick={notifications}><span /></button></div><div className="notification-explainer"><CircleHelp size={17} /><p>Notifikasi muncul selama aplikasi terbuka di browser. {permission === 'denied' ? 'Izin browser saat ini ditolak. Ubah melalui setelan izin situs untuk mengaktifkannya.' : !supported ? 'Browser ini belum mendukung notifikasi.' : 'Mengizinkan notifikasi tidak mengubah jadwal pengingat Anda.'}</p></div></section><section className="panel settings-section"><div className="section-heading"><h2>Ekspor & impor riwayat</h2><HardDrive size={21} /></div><p className="settings-description">Simpan salinan catatan Anda atau pindahkan riwayat dari Buku Servis sebelumnya.</p><div className="file-actions"><div><span className="file-icon"><FileDown size={24} /></span><strong>Ekspor riwayat</strong><p>Semua kunjungan dan kendaraan terkait dalam satu berkas CSV.</p><button className="button secondary" onClick={exportFile} disabled={!!fileBusy}>{fileBusy === 'export' ? <LoaderCircle size={17} className="spin" /> : <FileDown size={17} />}{fileBusy === 'export' ? 'Mengekspor…' : 'Ekspor CSV'}</button></div><div><span className="file-icon"><FileUp size={24} /></span><strong>Impor riwayat</strong><p>Pilih CSV hasil ekspor. Catatan yang identik akan dilewati.</p><input ref={fileInput} type="file" accept=".csv,text/csv" aria-label="Berkas impor CSV" className="sr-only" onChange={importFile} /><button className="button secondary" disabled={!!fileBusy} onClick={() => fileInput.current.click()}>{fileBusy === 'import' ? <LoaderCircle size={17} className="spin" /> : <FileUp size={17} />}{fileBusy === 'import' ? 'Mengimpor…' : 'Pilih berkas CSV'}</button></div></div>{importResult && <div className={importResult.success ? 'import-result success' : 'form-error'} role="status">{importResult.message}</div>}<p className="settings-footnote">CSV tidak mencakup pengingat, profil, atau kendaraan yang belum memiliki catatan servis.</p></section></div><aside className="settings-aside"><section className="help-card"><span><BookOpenCheck size={30} /></span><h2>Sedikit catatan,<br />banyak manfaat.</h2><p>Belum yakin mulai dari mana? Kenali cara mencatat servis dan memulihkan riwayat.</p><button className="button secondary" onClick={onHelp}><CircleHelp size={17} />Buka panduan</button></section><div className="privacy-note"><ShieldCheck size={20} /><div><strong>Lokal, sederhana, milik Anda.</strong><p>Database tersimpan di folder data pada komputer ini. Buat salinan CSV secara berkala.</p></div></div><p className="version-label">BUKU SERVIS MOTOR<br /><span>Versi web {appVersion}</span></p></aside></div></>;
}
function Help({ onClose }) {
  return <Modal title="Panduan Buku Servis" subtitle="Catatan kecil untuk motor yang lebih terawat." onClose={onClose}><div className="help-body">{[{ icon: Bike, title: 'Mulai dari kendaraan', text: 'Tambahkan nama dan pelat motor. Pilih kendaraan aktif untuk melihat riwayat dan pengingat milik motor tersebut.' }, { icon: Wrench, title: 'Catat setiap kunjungan', text: 'Isi tanggal dan pilih satu atau beberapa pekerjaan. Biaya, bengkel, kilometer, dan catatan boleh dikosongkan. Nota lama bisa dicatat kapan saja; Garasi tetap menampilkan tanggal servis terbaru.' }, { icon: Search, title: 'Temukan pekerjaan terakhir', text: 'Buka Riwayat dan cari pekerjaan, misalnya OLI, atau nama bengkel. Buka hasil untuk melihat rincian dan mengoreksi catatan.' }, { icon: Bell, title: 'Rencanakan perawatan', text: 'Pilih komponen dan isi target tanggal atau kilometer. Perbarui odometer ketika Anda membaca kilometer motor. Notifikasi browser hanya dikirim saat aplikasi terbuka dan izin diberikan.' }, { icon: FileDown, title: 'Simpan salinan riwayat', text: 'Ekspor CSV dari Pengaturan. Pilih berkas CSV saat ingin memulihkan riwayat. Catatan identik dilewati. Jika ada baris rusak atau konflik ID, seluruh impor dibatalkan.' }].map(({ icon: Icon, title, text }) => <section key={title}><span><Icon size={22} /></span><div><h3>{title}</h3><p>{text}</p></div></section>)}</div><div className="form-footer"><button className="button primary" onClick={onClose}><Check size={18} />Mengerti</button></div></Modal>;
}
