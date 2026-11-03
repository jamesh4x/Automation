import { useMemo, useState } from 'react';
import { Search, Filter, Mic, Camera, FileText, MapPin, Calendar, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { listSurveys } from '../lib/surveyRepository';
import { useLoader } from '../hooks/useLoader';
import type { SurveyStatus } from '../types';

const statusConfig: Record<SurveyStatus, { label: string; color: string; bg: string }> = {
  uploaded: { label: 'Terunggah', color: '#0071e3', bg: '#0071e314' },
  processing: { label: 'Diproses', color: '#0071e3', bg: '#0071e314' },
  generated: { label: 'Laporan Dibuat', color: '#ff9500', bg: '#ff950014' },
  needs_review: { label: 'Perlu Ditinjau', color: '#ff9500', bg: '#ff950014' },
  approved: { label: 'Disetujui', color: '#1a7a32', bg: '#34c75914' },
  completed: { label: 'Selesai', color: '#34c759', bg: '#34c75914' },
  failed: { label: 'Gagal', color: '#ff3b30', bg: '#ff3b3014' },
};

type FilterId = 'all' | 'completed' | 'in-progress';

export default function SurveyHistory() {
  const { data: surveys, loading, error, reload } = useLoader(listSurveys);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (surveys ?? []).filter((s) => {
      const matchesQuery =
        q === '' ||
        s.supplierName.toLowerCase().includes(q) ||
        (s.location ?? '').toLowerCase().includes(q) ||
        (s.productName ?? '').toLowerCase().includes(q);
      const matchesFilter =
        filter === 'all' || (filter === 'completed' ? s.status === 'completed' : s.status !== 'completed');
      return matchesQuery && matchesFilter;
    });
  }, [surveys, query, filter]);

  const filterTabs: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'completed', label: 'Selesai' },
    { id: 'in-progress', label: 'Belum Selesai' },
  ];

  return (
    <div className="pb-12">
      <PageHeader title="Survey History" subtitle="Riwayat seluruh survei supplier yang tersimpan" />

      <Reveal>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input
              className="input-field pl-10"
              placeholder="Cari supplier, lokasi, atau produk…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            {filterTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all"
                style={{
                  background: filter === t.id ? 'var(--accent)' : 'transparent',
                  color: filter === t.id ? 'white' : 'var(--muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="space-y-4">
        {loading && <p className="text-[14px] text-[var(--muted)]">Memuat survei…</p>}

        {!loading && error && (
          <div role="alert" className="glass-card p-6 flex items-center justify-between gap-4">
            <p className="text-[14px] text-[var(--danger)]">{error}</p>
            <button className="btn-secondary" onClick={reload}>Coba lagi</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <Reveal>
            <div className="glass-card p-12 text-center">
              <Filter size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
              <p className="text-[15px] font-medium">
                {(surveys ?? []).length === 0 ? 'Belum ada survei tersimpan' : 'Tidak ada survei ditemukan'}
              </p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>
                {(surveys ?? []).length === 0 ? 'Survei yang disimpan dari menu New Survey akan tampil di sini.' : 'Coba ubah kata kunci atau filter'}
              </p>
            </div>
          </Reveal>
        )}

        {!loading &&
          !error &&
          filtered.map((s, i) => {
            const sc = statusConfig[s.status];
            return (
              <Reveal key={s.id} delay={Math.min(i, 8) * 60}>
                <div className="glass-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <h3 className="text-[16px] font-semibold tracking-tight mb-2">{s.supplierName}</h3>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1.5"><Calendar size={13} /> {formatDate(s.surveyDate)}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={13} /> {s.location ?? 'Lokasi belum dicatat'}</span>
                        <span className="flex items-center gap-1.5"><Users size={13} /> {s.team.length} anggota</span>
                      </div>
                      {s.objectives.length > 0 && (
                        <p className="text-[13px] mt-2.5" style={{ color: 'var(--ink)' }}>{s.objectives.join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AttachBadge has={s.fileKinds.includes('recording')} icon={Mic} label="Rekaman" />
                      <AttachBadge has={s.fileKinds.includes('photo')} icon={Camera} label="Foto" />
                      <AttachBadge has={s.fileKinds.includes('document')} icon={FileText} label="Dokumen" />
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
      </div>
    </div>
  );
}

function AttachBadge({ has, icon: Icon, label }: { has: boolean; icon: LucideIcon; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium"
      style={{
        background: has ? '#34c75914' : 'var(--graphite-100)',
        color: has ? '#1a7a32' : 'var(--muted)',
        opacity: has ? 1 : 0.6,
      }}
      title={`${label}: ${has ? 'ada' : 'tidak ada'}`}
    >
      <Icon size={13} strokeWidth={has ? 2.2 : 1.6} />
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
