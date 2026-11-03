import { useState } from 'react';
import { Search, Star, MapPin, Plus, Building2, Phone } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { suppliers } from '../data/mockData';
import type { Supplier } from '../types';

const statusConfig = {
  aktif: { label: 'Aktif', color: '#34c759', bg: '#34c75914' },
  'tidak aktif': { label: 'Tidak Aktif', color: '#6e6e73', bg: 'var(--graphite-100)' },
  evaluasi: { label: 'Evaluasi', color: '#ff9500', bg: '#ff950014' },
} as const;

export default function SupplierDatabase() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const categories = Array.from(new Set(suppliers.map((s) => s.category)));
  const filtered = suppliers.filter((s) => {
    const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase()) || s.location.toLowerCase().includes(query.toLowerCase());
    const matchesCat = category === 'all' || s.category === category;
    return matchesQuery && matchesCat;
  });

  return (
    <div className="pb-12">
      <PageHeader
        title="Supplier Database"
        subtitle="Database seluruh supplier terdaftar"
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Tambah Supplier
          </button>
        }
      />

      <Reveal>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input
              className="input-field pl-10"
              placeholder="Cari nama atau lokasi supplier…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="input-field sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </Reveal>

      {/* Table */}
      <Reveal delay={80}>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th className="text-left text-[12px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--muted)' }}>Supplier</th>
                  <th className="text-left text-[12px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--muted)' }}>Kategori</th>
                  <th className="text-left text-[12px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--muted)' }}>Lokasi</th>
                  <th className="text-left text-[12px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--muted)' }}>Kontak</th>
                  <th className="text-left text-[12px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--muted)' }}>Survei Terakhir</th>
                  <th className="text-left text-[12px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--muted)' }}>Rating</th>
                  <th className="text-left text-[12px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <SupplierRow key={s.id} supplier={s} isLast={i === filtered.length - 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function SupplierRow({ supplier: s, isLast }: { supplier: Supplier; isLast: boolean }) {
  const sc = statusConfig[s.status];
  return (
    <tr
      className="transition-colors hover:bg-black/[0.03] cursor-pointer"
      style={isLast ? undefined : { borderBottom: '1px solid var(--line)' }}
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 36, height: 36, background: '#0071e314' }}>
            <Building2 size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-[14px] font-medium">{s.name}</p>
            <p className="text-[12px]" style={{ color: 'var(--muted)' }}>{s.id}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-[13px]">{s.category}</td>
      <td className="px-5 py-4">
        <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
          <MapPin size={13} /> {s.location}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
          <Phone size={13} /> {s.contact}
        </span>
      </td>
      <td className="px-5 py-4 text-[13px]" style={{ color: 'var(--muted)' }}>{formatDate(s.lastSurveyDate)}</td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1">
          <Star size={14} fill="#ff9500" style={{ color: '#ff9500' }} />
          <span className="text-[13px] font-medium">{s.rating.toFixed(1)}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
      </td>
    </tr>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
