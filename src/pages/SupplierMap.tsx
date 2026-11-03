import { MapPinned, Search, Navigation, Crosshair, Layers3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';

const radiusOptions = ['1 km', '5 km', '10 km', 'Kustom'];

export default function SupplierMap() {
  return (
    <div className="max-w-6xl pb-16">
      <PageHeader
        eyebrow="Geografi"
        title="Supplier Map"
        subtitle="Lokasi supplier, pencarian wilayah, radius, dan perencanaan rute kunjungan."
      />

      <Reveal>
        <div className="glass-card flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--subtle)]" />
            <input className="input-field pl-10" placeholder="Cari wilayah, misalnya Karawang" disabled />
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-muted)] p-1">
            {radiusOptions.map((r, i) => (
              <span
                key={r}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                  i === 0 ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--subtle)]'
                }`}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="glass-card relative mt-6 flex h-[460px] flex-col items-center justify-center overflow-hidden px-6 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <MapPinned size={26} strokeWidth={1.8} />
          </div>
          <h2 className="relative mt-5 text-[18px] font-semibold">Peta belum terhubung</h2>
          <p className="relative mt-2 max-w-md text-[14px] text-[var(--muted)]">
            Penanda supplier akan muncul setelah koordinat lokasi disimpan di profil supplier. Supplier tanpa koordinat
            ditandai sebagai belum terverifikasi, tanpa menggunakan lokasi perkiraan.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3 text-[12px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-3 py-1.5 border border-[var(--line)]">
              <Crosshair size={13} /> Penanda lokasi
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-3 py-1.5 border border-[var(--line)]">
              <Layers3 size={13} /> Pengelompokan
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-3 py-1.5 border border-[var(--line)]">
              <Navigation size={13} /> Urutan rute
            </span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
