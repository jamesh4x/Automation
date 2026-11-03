import { useState } from 'react';
import { Search, FileText, Download, Eye, Globe, Calendar } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { reports } from '../data/mockData';

const statusConfig = {
  selesai: { label: 'Selesai', color: '#34c759', bg: '#34c75914' },
  tertunda: { label: 'Tertunda', color: '#ff9500', bg: '#ff950014' },
  draft: { label: 'Draft', color: '#6e6e73', bg: 'var(--graphite-100)' },
} as const;

const langLabels: Record<string, string> = {
  'ID-ZH': 'Indonesia — Mandarin',
  ID: 'Indonesia',
  ZH: 'Mandarin',
};

export default function ReportManagement() {
  const [query, setQuery] = useState('');

  const filtered = reports.filter((r) =>
    r.supplierName.toLowerCase().includes(query.toLowerCase()) || r.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="pb-12">
      <PageHeader
        title="Report Management"
        subtitle="Kelola dan hasilkan laporan survei bilingual Indonesia–Mandarin"
        action={
          <button className="btn-primary flex items-center gap-2">
            <FileText size={16} />
            Hasilkan Laporan
          </button>
        }
      />

      <Reveal>
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            className="input-field pl-10"
            placeholder="Cari laporan berdasarkan supplier atau ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((r, i) => {
          const sc = statusConfig[r.status];
          return (
            <Reveal key={r.id} delay={i * 70}>
              <div className="glass-card p-5 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center rounded-xl" style={{ width: 38, height: 38, background: '#5e5ce614' }}>
                      <FileText size={18} style={{ color: '#5e5ce6' }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono font-medium" style={{ color: 'var(--muted)' }}>{r.id}</p>
                    </div>
                  </div>
                  <span className="badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                </div>

                <h3 className="text-[15px] font-semibold tracking-tight mb-3 leading-snug">{r.supplierName}</h3>

                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                    <Calendar size={13} /> Survei: {formatDate(r.surveyDate)}
                  </div>
                  <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                    <Globe size={13} /> {langLabels[r.language]}
                  </div>
                  {r.generatedDate && (
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                      <FileText size={13} /> Diterbitkan: {formatDate(r.generatedDate)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                  <button className="flex-1 btn-secondary flex items-center justify-center gap-1.5" disabled={r.status === 'tertunda'} style={r.status === 'tertunda' ? { opacity: 0.4 } : undefined}>
                    <Eye size={14} /> Lihat
                  </button>
                  <button className="flex-1 btn-secondary flex items-center justify-center gap-1.5" disabled={r.status !== 'selesai'} style={r.status !== 'selesai' ? { opacity: 0.4 } : undefined}>
                    <Download size={14} /> Unduh
                  </button>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
