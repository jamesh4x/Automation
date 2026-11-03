import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, Filter, Mic, Camera, FileText, MapPin, Calendar, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { surveys } from '../data/mockData';

const statusConfig = {
  selesai: { label: 'Selesai', color: '#34c759', bg: '#34c75914' },
  berjalan: { label: 'Berjalan', color: '#0071e3', bg: '#0071e314' },
  tertunda: { label: 'Tertunda', color: '#ff9500', bg: '#ff950014' },
} as const;

export default function SurveyHistory() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'selesai' | 'berjalan' | 'tertunda'>('all');

  const filtered = surveys.filter((s) => {
    const matchesQuery = s.supplierName.toLowerCase().includes(query.toLowerCase()) || s.id.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || s.status === filter;
    return matchesQuery && matchesFilter;
  });

  const filterTabs: { id: typeof filter; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'selesai', label: 'Selesai' },
    { id: 'berjalan', label: 'Berjalan' },
    { id: 'tertunda', label: 'Tertunda' },
  ];

  return (
    <div className="pb-12">
      <PageHeader title="Survey History" subtitle="Riwayat seluruh survei supplier yang pernah dilakukan" />

      {/* Search & filter */}
      <Reveal>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input
              className="input-field pl-10"
              placeholder="Cari supplier atau ID survei…"
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

      {/* Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Reveal>
            <div className="glass-card p-12 text-center">
              <Filter size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
              <p className="text-[15px] font-medium">Tidak ada survei ditemukan</p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>Coba ubah kata kunci atau filter</p>
            </div>
          </Reveal>
        ) : (
          filtered.map((s, i) => {
            const sc = statusConfig[s.status];
            return (
              <Reveal key={s.id} delay={i * 60}>
                <div className="glass-card p-5 cursor-pointer">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[12px] font-mono font-medium" style={{ color: 'var(--muted)' }}>{s.id}</span>
                        <span className="badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <h3 className="text-[16px] font-semibold tracking-tight mb-2">{s.supplierName}</h3>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1.5"><Calendar size={13} /> {formatDate(s.date)}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={13} /> {s.location}</span>
                        <span className="flex items-center gap-1.5"><Users size={13} /> {s.team.length} anggota</span>
                      </div>
                      <p className="text-[13px] mt-2.5" style={{ color: 'var(--ink)' }}>{s.purpose}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AttachBadge has={s.hasRecording} icon={Mic} label="Rekaman" />
                      <AttachBadge has={s.hasPhotos} icon={Camera} label="Foto" />
                      <AttachBadge has={s.hasDocuments} icon={FileText} label="Dokumen" />
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })
        )}
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
  const date = new Date(d);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
