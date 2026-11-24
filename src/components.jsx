import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpenCheck, Droplets, Disc3, Battery, CircleGauge, Sparkles, Wrench, Wind } from 'lucide-react';
import { STATUS } from '../shared/domain.js';
import { useScrollLock } from './mobile.js';

export const fmtNumber = value => new Intl.NumberFormat('id-ID').format(value);
export const fmtKm = value => value === null || value === undefined ? 'Belum diisi' : `${fmtNumber(value)} km`;
export const fmtMoney = value => value === null || value === undefined ? 'Belum diisi' : `Rp${fmtNumber(value)}`;
export const fmtDate = (date, long = false) => date ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00+07:00`)) : 'Belum diisi';
export const fmtMonth = date => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00+07:00`));
export const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

export function ComponentIcon({ name = '', ...props }) {
  const text = name.toLowerCase();
  const Icon = text.includes('oli') ? Droplets : text.includes('rem') ? Disc3 : text.includes('aki') ? Battery : text.includes('ban') ? CircleGauge : text.includes('filter') ? Wind : text.includes('busi') ? Sparkles : Wrench;
  return <Icon {...props} />;
}
export function StatusBadge({ status, inactive = false }) {
  const item = inactive ? { label: 'Nonaktif', tone: 'muted' } : STATUS[status];
  return <span className={`status-badge ${item.tone}`}><span aria-hidden="true" />{item.label}</span>;
}
export function Modal({ title, subtitle, children, onClose, wide = false }) {
  const ref = useRef(null);
  const titleId = React.useId();
  useScrollLock(true);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    const cancel = event => { event.preventDefault(); onClose(); };
    dialog.addEventListener('cancel', cancel);
    return () => { dialog.removeEventListener('cancel', cancel); if (dialog.open) dialog.close(); };
  }, [onClose]);
  return createPortal(<dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} aria-labelledby={titleId}>
    <div className="modal-head"><div><p className="eyebrow">BUKU SERVIS</p><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={22} /></button></div>
    {children}
  </dialog>, document.body);
}
export function Field({ label, hint, children, className = '' }) {
  return <label className={`field ${className}`}><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}
export function FormError({ error }) { return error ? <div className="form-error" role="alert">{error}</div> : null; }
export function EmptyState({ title, description, children, compact = false }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}><div className="empty-icon"><BookOpenCheck size={30} strokeWidth={1.6} /></div><h3>{title}</h3><p>{description}</p>{children && <div className="empty-actions">{children}</div>}</div>;
}
export function MotorIllustration({ className = '', color = '#204f46', label = 'Ilustrasi sepeda motor' }) {
  return <svg className={`motor-illustration ${className}`} viewBox="0 0 560 310" fill="none" role="img" aria-label={label}>
    <defs><linearGradient id="motor-paint" x1="120" y1="95" x2="280" y2="240"><stop stopColor={color} /><stop offset="1" stopColor="#112d2a" /></linearGradient><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c4ccc8" /><stop offset="1" stopColor="#788780" /></linearGradient></defs>
    <ellipse cx="290" cy="276" rx="225" ry="13" fill="#204f46" opacity=".10" />
    <g stroke="#222c2b" strokeWidth="18"><circle cx="133" cy="230" r="45" fill="#3c4542" /><circle cx="431" cy="230" r="45" fill="#3c4542" /></g>
    {[133, 431].map(cx => <g key={cx} stroke="#a9b3ac" strokeWidth="3"><circle cx={cx} cy="230" r="28" fill="#6a7770" /><circle cx={cx} cy="230" r="8" fill="#bac4bb" />{[0, 60, 120].map(deg => <path key={deg} d={`M${cx - 25} 230h50`} transform={`rotate(${deg} ${cx} 230)`} />)}</g>)}
    <path d="m122 228 99-26 98 23 81-88 31 93" stroke="#6d7c73" strokeWidth="11" strokeLinejoin="round" />
    <path d="m128 157 78-1 62 58 80-6 31-93 35-30 30 66-43 29-24 60-109 3-69-43-66-12-40-25z" fill="url(#motor-paint)" stroke="#15392f" strokeWidth="2" />
    <path d="m377 115 35-30 20 52-28 21-29 62-31-12z" fill={color} />
    <path d="m109 153 97 5 45 39-63-10-67-15-35-15z" fill="#547e66" />
    <path d="m127 164 63 6 22 14-70-8z" fill="#c0c9b4" opacity=".85" />
    <path d="m132 138 57 2 34 15-14 13-80-10-39-2-4-9 14-6z" fill="#252e2b" />
    <path d="m98 141 80-1 38 11-1 6-116-8z" fill="#455048" />
    <path d="m90 154-22 20 12 6 33-11" fill="#293a2e" />
    <path d="m90 161-19 1-7-9 22-1" fill="#cc7651" />
    <path d="m382 116 21-50-28-10-12 7 20 12-16 40" fill="#20372d" />
    <path d="m393 65 8-24 23-6" stroke="#3d4d42" strokeWidth="4" strokeLinecap="round" />
    <path d="m421 28 20 3-3 12-22 1z" fill="#2e3f35" stroke="#708576" strokeWidth="2" />
    <path d="m378 64-18-22-19-6" stroke="#3d4d42" strokeWidth="4" strokeLinecap="round" />
    <path d="m322 27 22 1 4 12-23 4z" fill="#2e3f35" stroke="#708576" strokeWidth="2" />
    <path d="m404 113 29-5 12 31-34 6z" fill="#dbdfbe" /><path d="m407 116 23-4 7 18-28 6z" fill="#f8edd0" />
    <path d="m415 155 18 3 7 64-11 4z" fill="url(#metal)" />
    <path d="M392 210c23-21 56-17 72 7l-12 1c-13-15-31-18-53-2z" fill={color} />
    <path d="m154 218 85 14 3 20-100-10-22-13 9-11z" fill="#35413b" stroke="#8c9b8b" strokeWidth="2" />
    <path d="m164 224 65 12-1 7-64-10z" fill="#bac4b5" />
    <path d="m256 213 66 2 15-9" stroke="#a2b495" strokeWidth="5" strokeLinecap="round" />
    <path d="m282 239-13 26h21" stroke="#3e4c3d" strokeWidth="5" strokeLinecap="round" />
    <path d="m384 151 13-4-20 40" stroke="#6a9278" strokeWidth="3" />
    <path d="m199 197 20 12" stroke="#e4dfad" strokeWidth="2" /><text x="171" y="186" transform="rotate(12 171 186)" fill="#d3dec5" fontSize="9" fontFamily="Arial" letterSpacing="2">BUKU SERVIS</text>
  </svg>;
}
