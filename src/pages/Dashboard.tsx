import { Building2, ClipboardCheck, FileCheck2, Clock, ArrowUpRight, FilePlus2, Mic, Camera, FileText, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PageId, SurveyRecord, Supplier } from '../types';
import { listSuppliers, listSurveys } from '../lib/surveyRepository';
import { useLoader } from '../hooks/useLoader';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';

const countBy = <T,>(items: T[], pick: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = pick(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

const formatMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Dashboard({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const suppliersState = useLoader(listSuppliers);
  const surveysState = useLoader(listSurveys);

  const loading = suppliersState.loading || surveysState.loading;
  const error = suppliersState.error ?? surveysState.error;

  if (loading) {
    return (
      <div className="pb-16">
        <PageHeader eyebrow="Ringkasan" title="Dashboard" subtitle="Memuat data dari database…" />
      </div>
    );
  }

  if (error || !suppliersState.data || !surveysState.data) {
    return (
      <div className="pb-16">
        <PageHeader eyebrow="Ringkasan" title="Dashboard" subtitle="Data belum dapat dimuat." />
        <div role="alert" className="glass-card p-6 text-[14px] text-[var(--danger)]">
          {error ?? 'Data belum dapat dimuat. Silakan muat ulang halaman.'}
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      suppliers={suppliersState.data}
      surveys={surveysState.data}
      onNavigate={onNavigate}
    />
  );
}

function DashboardView({ suppliers, surveys, onNavigate }: { suppliers: Supplier[]; surveys: SurveyRecord[]; onNavigate: (p: PageId) => void }) {
  const completed = surveys.filter((s) => s.status === 'completed').length;
  const pending = surveys.length - completed;

  const stats: { label: string; value: number; hint: string; icon: LucideIcon; tone: string; soft: string }[] = [
    { label: 'Total Supplier', value: suppliers.length, hint: 'Terdaftar di database', icon: Building2, tone: 'var(--accent)', soft: 'var(--accent-soft)' },
    { label: 'Total Survei', value: surveys.length, hint: 'Kunjungan tercatat', icon: ClipboardCheck, tone: 'var(--info)', soft: 'var(--info-soft)' },
    { label: 'Survei Selesai', value: completed, hint: 'Status selesai', icon: FileCheck2, tone: 'var(--success)', soft: 'var(--success-soft)' },
    { label: 'Survei Belum Selesai', value: pending, hint: 'Masih dalam proses', icon: Clock, tone: 'var(--warning)', soft: 'var(--warning-soft)' },
  ];

  const categoryCounts = Object.entries(
    suppliers.reduce<Record<string, number>>((acc, s) => {
      s.categories.forEach((c) => (acc[c] = (acc[c] ?? 0) + 1));
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(...categoryCounts.map(([, n]) => n), 1);

  const monthCounts = Object.entries(countBy(surveys, (s) => s.surveyDate.slice(0, 7))).sort((a, b) => a[0].localeCompare(b[0]));
  const maxMonth = Math.max(...monthCounts.map(([, n]) => n), 1);

  const recent = surveys.slice(0, 5);
  const materialTotal = surveys.length;
  const withKind = (kind: SurveyRecord['fileKinds'][number]) => surveys.filter((s) => s.fileKinds.includes(kind)).length;

  return (
    <div className="max-w-6xl pb-16">
      <PageHeader
        eyebrow="Ringkasan"
        title="Dashboard"
        subtitle="Ringkasan data supplier dan survei yang tersimpan di database."
        action={
          <button className="btn-primary" onClick={() => onNavigate('new-survey')}>
            <FilePlus2 size={16} />
            Survei Baru
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.label} delay={i * 70}>
              <div className="stat-card h-full">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: s.soft, color: s.tone }}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <ArrowUpRight size={16} className="text-[var(--subtle)]" />
                </div>
                <p className="text-[36px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{s.value}</p>
                <p className="mt-3 text-[14px] font-medium text-[var(--ink-soft)]">{s.label}</p>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">{s.hint}</p>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <section className="glass-card h-full p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight">Survei Terbaru</h2>
                <p className="mt-1 text-[13px] text-[var(--muted)]">Lima survei terakhir yang dicatat</p>
              </div>
              <button className="text-[13px] font-medium text-[var(--accent)] hover:underline" onClick={() => onNavigate('survey-history')}>
                Lihat semua
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-[var(--muted)]">Belum ada survei. Mulai dari menu New Survey.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {recent.map((s) => (
                  <li key={s.id} className="flex items-center gap-4 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] text-[var(--accent)]">
                      <ClipboardCheck size={16} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium">{s.supplierName}</p>
                      <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{s.objectives.join(', ') || s.surveyType || 'Tanpa tujuan tercatat'}</p>
                    </div>
                    <span className="shrink-0 text-[12px] text-[var(--subtle)]">{formatDate(s.surveyDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section className="glass-card h-full p-7">
            <h2 className="text-[17px] font-semibold tracking-tight">Status Survei</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Dari {surveys.length} survei tercatat</p>
            <div className="mt-6 flex justify-center">
              <StatusDonut completed={completed} pending={pending} total={surveys.length} />
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="glass-card h-full p-7">
            <h2 className="text-[17px] font-semibold tracking-tight">Supplier per Kategori</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Berdasarkan kategori yang dicatat</p>
            {categoryCounts.length === 0 ? (
              <p className="mt-6 text-[13px] text-[var(--muted)]">Belum ada kategori.</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {categoryCounts.map(([name, n]) => (
                  <li key={name}>
                    <div className="mb-1.5 flex justify-between text-[13px]">
                      <span className="text-[var(--ink-soft)]">{name}</span>
                      <span className="font-semibold tabular-nums">{n}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--graphite-100)]">
                      <div className="h-full rounded-full bg-[var(--graphite-800)] transition-[width] duration-700 ease-out" style={{ width: `${(n / maxCategory) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>

        <Reveal delay={80} className="xl:col-span-2">
          <section className="glass-card h-full p-7">
            <h2 className="text-[17px] font-semibold tracking-tight">Survei per Bulan</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Frekuensi kunjungan berdasarkan tanggal survei</p>
            {monthCounts.length === 0 ? (
              <p className="mt-8 text-[13px] text-[var(--muted)]">Belum ada survei.</p>
            ) : (
              <div className="mt-8 flex h-44 items-end gap-6 px-2">
                {monthCounts.map(([month, n]) => (
                  <div key={month} className="flex flex-1 flex-col items-center gap-3">
                    <span className="text-[13px] font-semibold tabular-nums">{n}</span>
                    <div
                      className="w-full max-w-[72px] rounded-t-xl bg-[var(--accent)] transition-[height] duration-700 ease-out"
                      style={{ height: `${(n / maxMonth) * 120}px`, opacity: 0.85 }}
                    />
                    <span className="text-[12px] text-[var(--muted)]">{formatMonth(month)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        <Reveal delay={160}>
          <section className="glass-card h-full p-7">
            <h2 className="text-[17px] font-semibold tracking-tight">Materi Survei</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Survei yang memiliki jenis bahan tertentu</p>
            <ul className="mt-6 space-y-4">
              <MaterialRow icon={Mic} label="Rekaman" count={withKind('recording')} total={materialTotal} />
              <MaterialRow icon={Camera} label="Foto" count={withKind('photo')} total={materialTotal} />
              <MaterialRow icon={FileText} label="Dokumen" count={withKind('document')} total={materialTotal} />
              <MaterialRow icon={Users} label="Tim tercatat" count={surveys.filter((s) => s.team.length > 0).length} total={materialTotal} />
            </ul>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

function MaterialRow({ icon: Icon, label, count, total }: { icon: LucideIcon; label: string; count: number; total: number }) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <li>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-2 text-[var(--ink-soft)]">
          <Icon size={14} className="text-[var(--muted)]" />
          {label}
        </span>
        <span className="tabular-nums text-[var(--muted)]">
          {count}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--graphite-100)]">
        <div className="h-full rounded-full bg-[var(--success)] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

function StatusDonut({ completed, pending, total }: { completed: number; pending: number; total: number }) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const completedDash = total ? (completed / total) * circumference : 0;
  const pendingDash = total ? (pending / total) * circumference : 0;

  return (
    <svg width="168" height="168" viewBox="0 0 168 168" role="img" aria-label={`Total ${total} survei`}>
      <circle cx="84" cy="84" r={radius} fill="none" stroke="var(--graphite-100)" strokeWidth="14" />
      {completed > 0 && (
        <circle cx="84" cy="84" r={radius} fill="none" stroke="var(--success)" strokeWidth="14"
          strokeDasharray={`${Math.max(completedDash - 3, 0)} ${circumference}`} transform="rotate(-90 84 84)" />
      )}
      {pending > 0 && (
        <circle cx="84" cy="84" r={radius} fill="none" stroke="var(--warning)" strokeWidth="14"
          strokeDasharray={`${Math.max(pendingDash - 3, 0)} ${circumference}`}
          strokeDashoffset={-completedDash} transform="rotate(-90 84 84)" />
      )}
      <text x="84" y="82" textAnchor="middle" fontSize="28" fontWeight="600" fill="var(--ink)">{total}</text>
      <text x="84" y="102" textAnchor="middle" fontSize="11" fill="var(--muted)">Survei</text>
    </svg>
  );
}
