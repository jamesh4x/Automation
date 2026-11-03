import { useMemo, useState } from 'react';
import { Search, MapPin, Building2, Phone } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { listSuppliers, listSurveys } from '../lib/surveyRepository';
import { useLoader } from '../hooks/useLoader';
import type { Supplier, SupplierStatus, SurveyRecord } from '../types';

const statusConfig: Record<SupplierStatus, { label: string; color: string; bg: string }> = {
  aktif: { label: 'Aktif', color: '#34c759', bg: '#34c75914' },
  'tidak aktif': { label: 'Tidak Aktif', color: '#6e6e73', bg: 'var(--graphite-100)' },
  evaluasi: { label: 'Evaluasi', color: '#ff9500', bg: '#ff950014' },
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const supplierLocation = (s: Supplier) => [s.regency, s.province].filter(Boolean).join(', ') || s.address || 'Lokasi belum dicatat';

export default function SupplierDatabase() {
  const suppliersState = useLoader(listSuppliers);
  const surveysState = useLoader(listSurveys);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const suppliers = suppliersState.data ?? [];
  const surveys = surveysState.data ?? [];
  const loading = suppliersState.loading || surveysState.loading;
  const error = suppliersState.error ?? surveysState.error;

  const categories = useMemo(
    () => Array.from(new Set(suppliers.flatMap((s) => s.categories))).sort(),
    [suppliers]
  );

  const lastSurveyBySupplier = useMemo(() => {
    const map = new Map<string, SurveyRecord>();
    surveys.forEach((s) => {
      const prev = map.get(s.supplierId);
      if (!prev || s.surveyDate > prev.surveyDate) map.set(s.supplierId, s);
    });
    return map;
  }, [surveys]);

  const filtered = suppliers.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || s.name.toLowerCase().includes(q) || supplierLocation(s).toLowerCase().includes(q);
    const matchesCat = category === 'all' || s.categories.includes(category);
    return matchesQuery && matchesCat;
  });

  return (
    <div className="pb-12">
      <PageHeader title="Supplier Database" subtitle="Daftar supplier yang tercatat dari survei" />

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

      {loading && <p className="text-[14px] text-[var(--muted)]">Memuat supplier…</p>}

      {!loading && error && (
        <div role="alert" className="glass-card p-6 text-[14px] text-[var(--danger)]">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Building2 size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="text-[15px] font-medium">
            {suppliers.length === 0 ? 'Belum ada supplier tersimpan' : 'Tidak ada supplier ditemukan'}
          </p>
          <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>
            {suppliers.length === 0 ? 'Supplier dibuat otomatis saat survei pertama disimpan dari menu New Survey.' : 'Coba ubah kata kunci atau kategori'}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Reveal delay={80}>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Supplier', 'Kategori', 'Lokasi', 'Kontak', 'Survei Terakhir', 'Status'].map((h) => (
                      <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => {
                    const sc = statusConfig[s.status];
                    const last = lastSurveyBySupplier.get(s.id);
                    return (
                      <tr key={s.id} style={i === filtered.length - 1 ? undefined : { borderBottom: '1px solid var(--line)' }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 36, height: 36, background: '#0071e314' }}>
                              <Building2 size={16} style={{ color: 'var(--accent)' }} />
                            </div>
                            <p className="text-[14px] font-medium">{s.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[13px]">{s.categories.join(', ') || '—'}</td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
                            <MapPin size={13} /> {supplierLocation(s)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
                            <Phone size={13} /> {s.contactInfo ?? s.contactPerson ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[13px]" style={{ color: 'var(--muted)' }}>{last ? formatDate(last.surveyDate) : '—'}</td>
                        <td className="px-5 py-4">
                          <span className="badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
