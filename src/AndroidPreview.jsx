import React, { useEffect, useState } from 'react';
import { BookOpenCheck, Monitor, Smartphone } from 'lucide-react';

const SIZES = [
  { label: 'Ringkas · 360 × 800', width: 360, height: 800 },
  { label: 'Standar · 390 × 844', width: 390, height: 844 },
  { label: 'Besar · 412 × 915', width: 412, height: 915 },
];

export default function AndroidPreview() {
  const [selected, setSelected] = useState(1);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const size = SIZES[selected];
  const scale = Math.max(0.2, Math.min(1, (viewport.width - 48) / (size.width + 20), (viewport.height - 180) / (size.height + 20)));
  return <div className="android-preview">
    <header className="preview-toolbar">
      <a className="preview-brand" href="/"><span><BookOpenCheck size={24} /></span><strong>Buku Servis<small>Mode Android</small></strong></a>
      <div className="preview-controls"><label htmlFor="phone-size"><Smartphone size={18} /><span>Ukuran layar</span></label><select id="phone-size" value={selected} onChange={event => setSelected(Number(event.target.value))}>{SIZES.map((item, index) => <option key={item.width} value={index}>{item.label}</option>)}</select></div>
      <a className="button secondary" href="/"><Monitor size={18} />Tampilan desktop</a>
    </header>
    <main className="preview-stage">
      <div className="phone-frame" style={{ width: (size.width + 20) * scale, height: (size.height + 20) * scale, borderRadius: 34 * scale }}>
        <iframe title="Pratinjau Android Buku Servis" src="/?device=phone#garasi" style={{ width: size.width, height: size.height, top: 10 * scale, left: 10 * scale, transform: `scale(${scale})`, borderRadius: 25 }} />
      </div>
      <p className="preview-caption">Klik, ketik, dan gulir untuk mencoba aplikasi.<br /><span>Data sama dengan garasi Anda di tampilan desktop.</span></p>
    </main>
  </div>;
}
