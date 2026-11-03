import { FileText, Calendar } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { listSurveys } from '../lib/surveyRepository';
import { useLoader } from '../hooks/useLoader';

const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ReportManagement() {
  const { data: surveys, loading, error, reload } = useLoader(listSurveys);

  return (
    <div className="pb-12">
      <PageHeader
        title="Report Management"
        subtitle="Daftar survei yang menjadi dasar laporan bilingual Indonesia–Mandarin"
      />

      {loading && <p className="text-[14px] text-[var(--muted)]">Memuat survei…</p>}

      {!loading && error && (
        <div role="alert" className="glass-card p-6 flex items-center justify-between gap-4">
          <p className="text-[14px] text-[var(--danger)]">{error}</p>
          <button className="btn-secondary" onClick={reload}>Coba lagi</button>
        </div>
      )}

      {!loading && !error && (surveys ?? []).length === 0 && (
        <div className="glass-card p-12 text-center">
          <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="text-[15px] font-medium">Belum ada survei</p>
          <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>Laporan dapat dibuat setelah survei disimpan.</p>
        </div>
      )}

      {!loading && !error && (surveys ?? []).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(surveys ?? []).map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i, 8) * 70}>
              <div className="glass-card p-5 h-full flex flex-col">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex items-center justify-center rounded-xl" style={{ width: 38, height: 38, background: '#5e5ce614' }}>
                    <FileText size={18} style={{ color: '#5e5ce6' }} />
                  </div>
                  <span className="badge" style={{ background: 'var(--graphite-100)', color: 'var(--muted)' }}>Belum ada laporan</span>
                </div>
                <h3 className="text-[15px] font-semibold tracking-tight mb-3 leading-snug">{s.supplierName}</h3>
                <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                  <Calendar size={13} /> Survei: {formatDate(s.surveyDate)}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
