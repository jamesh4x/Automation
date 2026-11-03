import { Building2, ClipboardCheck, FileCheck2, Clock, ArrowUpRight, FilePlus2, Mic, Camera, FileText, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PageId, ActivityItem } from '../types';
import { activities, reports, suppliers, surveys } from '../data/mockData';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';

interface StatItem {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: string;
  soft: string;
}

const countBy = <T,>(items: T[], pick: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = pick(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

const activityIcon: Record<ActivityItem['type'], { icon: LucideIcon; tone: string }> = {
  survey: { icon: ClipboardCheck, tone: 'var(--accent)' },
  report: { icon: FileCheck2, tone: 'var(--info)' },
  supplier: { icon: Building2, tone: 'var(--success)' },
  upload: { icon: FileText, tone: 'var(--warning)' },
};

const reportStatusMeta = {
  selesai: { label: 'Selesai', color: 'var(--success)' },
  tertunda: { label: 'Tertunda', color: 'var(--warning)' },
  draft: { label: 'Draft', color: 'var(--subtle)' },
} as const;

export default function Dashboard({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const completed = reports.filter((r) => r.status === 'selesai').length;
  const pending = reports.filter((r) => r.status === 'tertunda').length;

  const stats: StatItem[] = [
    { label: 'Total Supplier', value: suppliers.length, hint: 'Terdaftar di database', icon: Building2, tone: 'var(--accent)', soft: 'var(--accent-soft)' },
    { label: 'Total Survei', value: surveys.length, hint: 'Kunjungan tercatat', icon: ClipboardCheck, tone: 'var(--info)', soft: 'var(--info-soft)' },
    { label: 'Laporan Selesai', value: completed, hint: 'Siap diunduh', icon: FileCheck2, tone: 'var(--success)', soft: 'var(--success-soft)' },
    { label: 'Laporan Tertunda', value: pending, hint: 'Menunggu proses', icon: Clock, tone: 'var(--warning)', soft: 'var(--warning-soft)' },
  ];

  const statusCounts = countBy(reports, (r) => r.status);
  const reportTotal = reports.length;

  const categoryCounts = Object.entries(countBy(suppliers, (s) => s.category)).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(...categoryCounts.map(([, n]) => n), 1);

  const monthCounts = Object.entries(countBy(surveys, (s) => s.date.slice(0, 7))).sort((a, b) => a[0].localeCompare(b[0]));
  const maxMonth = Math.max(...monthCounts.map(([, n]) => n), 1);

  return (
    <div className="max-w-6xl pb-16">
      <PageHeader
        eyebrow="Ringkasan"
        title="Selamat datang, Andi"
        subtitle="Pantau kunjungan supplier, progres laporan, dan aktivitas terbaru tim Purchasing dalam satu tampilan."
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
                <h2 className="text-[17px] font-semibold tracking-tight">Aktivitas Terbaru</h2>
                <p className="mt-1 text-[13px] text-[var(--muted)]">Survei, laporan, dan unggahan terakhir</p>
              </div>
              <button className="text-[13px] font-medium text-[var(--accent)] hover:underline" onClick={() => onNavigate('survey-history')}>
                Lihat semua
              </button>
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {activities.map((a) => {
                const meta = activityIcon[a.type];
                const Icon = meta.icon;
                return (
                  <li key={a.id} className="flex items-center gap-4 py-4">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]"
                      style={{ color: meta.tone }}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium">{a.title}</p>
                      <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{a.description}</p>
                    </div>
                    <span className="shrink-0 text-[12px] text-[var(--subtle)]">{a.timestamp}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section className="glass-card h-full p-7">
            <h2 className="text-[17px] font-semibold tracking-tight">Status Laporan</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Progres {reportTotal} laporan</p>
            <div className="mt-6 flex justify-center">
              <ReportDonut counts={statusCounts} total={reportTotal} />
            </div>
            <ul className="mt-6 space-y-3">
              {(Object.keys(reportStatusMeta) as (keyof typeof reportStatusMeta)[]).map((key) => (
                <li key={key} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-[var(--muted)]">
                    <span className="h-2 w-2 rounded-full" style={{ background: reportStatusMeta[key].color }} />
                    {reportStatusMeta[key].label}
                  </span>
                  <span className="font-semibold tabular-nums">{statusCounts[key] ?? 0}</span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal>
          <section className="glass-card h-full p-7">
            <h2 className="text-[17px] font-semibold tracking-tight">Supplier per Kategori</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Berdasarkan kategori yang dicatat</p>
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
          </section>
        </Reveal>

        <Reveal delay={80} className="xl:col-span-2">
          <section className="glass-card h-full p-7">
            <h2 className="text-[17px] font-semibold tracking-tight">Survei per Bulan</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Frekuensi kunjungan supplier</p>
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
          </section>
        </Reveal>

        <Reveal delay={160}>
          <section className="glass-card h-full p-7">
            <h2 className="text-[17px] font-semibold tracking-tight">Materi Survei</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Kelengkapan bahan pada setiap survei</p>
            <ul className="mt-6 space-y-4">
              <MaterialRow icon={Mic} label="Rekaman" count={surveys.filter((s) => s.hasRecording).length} total={surveys.length} />
              <MaterialRow icon={Camera} label="Foto" count={surveys.filter((s) => s.hasPhotos).length} total={surveys.length} />
              <MaterialRow icon={FileText} label="Dokumen" count={surveys.filter((s) => s.hasDocuments).length} total={surveys.length} />
              <MaterialRow icon={Users} label="Tim tercatat" count={surveys.filter((s) => s.team.length > 0).length} total={surveys.length} />
            </ul>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

function formatMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
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

function ReportDonut({ counts, total }: { counts: Record<string, number>; total: number }) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const keys = Object.keys(reportStatusMeta) as (keyof typeof reportStatusMeta)[];

  return (
    <svg width="168" height="168" viewBox="0 0 168 168" role="img" aria-label={`Total ${total} laporan`}>
      <circle cx="84" cy="84" r={radius} fill="none" stroke="var(--graphite-100)" strokeWidth="14" />
      {total > 0 &&
        keys.map((key) => {
          const value = counts[key] ?? 0;
          if (value === 0) return null;
          const dash = (value / total) * circumference;
          const el = (
            <circle
              key={key}
              cx="84"
              cy="84"
              r={radius}
              fill="none"
              stroke={reportStatusMeta[key].color}
              strokeWidth="14"
              strokeDasharray={`${Math.max(dash - 3, 0)} ${circumference}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 84 84)"
            />
          );
          offset += dash;
          return el;
        })}
      <text x="84" y="82" textAnchor="middle" fontSize="28" fontWeight="600" fill="var(--ink)">
        {total}
      </text>
      <text x="84" y="102" textAnchor="middle" fontSize="11" fill="var(--muted)">
        Laporan
      </text>
    </svg>
  );
}
