import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Download, FileText, Languages, LoaderCircle, X } from 'lucide-react';
import { Document, HeadingLevel, Packer, Paragraph } from 'docx';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { fetchLatestReports, type ReportRecord } from '../lib/groqService';
import { listSurveys } from '../lib/surveyRepository';
import { useLoader } from '../hooks/useLoader';
import type { SurveyRecord } from '../types';

const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

type SelectedReport = { survey: SurveyRecord; report: ReportRecord };

export default function ReportManagement() {
  const surveysLoader = useLoader(listSurveys);
  const surveys = surveysLoader.data ?? [];
  const reportsLoader = useLoader(() => fetchLatestReports(surveys.map((survey) => survey.id)));
  const [selected, setSelected] = useState<SelectedReport | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (surveys.length > 0) reportsLoader.reload();
  }, [surveys.length]);

  const reportCards = useMemo(
    () => surveys.map((survey) => ({ survey, report: reportsLoader.data?.[survey.id] ?? null })),
    [surveys, reportsLoader.data]
  );

  const downloadDocx = async (item: SelectedReport) => {
    setDownloading(true);
    try {
      const document = new Document({
        sections: [{
          children: [
            new Paragraph({ text: `Supplier Survey Report — ${item.survey.supplierName}`, heading: HeadingLevel.TITLE }),
            new Paragraph({ text: `Tanggal survei: ${formatDate(item.survey.surveyDate)}` }),
            new Paragraph({ text: 'Laporan Bahasa Indonesia', heading: HeadingLevel.HEADING_1 }),
            ...item.report.idText.split('\n').map((text) => new Paragraph(text)),
            new Paragraph({ text: 'Supplier Survey Report — 简体中文', heading: HeadingLevel.HEADING_1 }),
            ...item.report.zhText.split('\n').map((text) => new Paragraph(text)),
          ],
        }],
      });
      const blob = await Packer.toBlob(document);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `supplier-survey-${item.survey.supplierName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const loading = surveysLoader.loading || (surveys.length > 0 && reportsLoader.loading);
  const error = surveysLoader.error ?? reportsLoader.error;

  return (
    <div className="pb-12">
      <PageHeader title="Report Management" subtitle="Buka, tinjau, dan unduh laporan bilingual Indonesia–Mandarin" />
      {loading && <p className="text-[14px] text-[var(--muted)]">Memuat laporan tersimpan…</p>}
      {!loading && error && <div role="alert" className="glass-card p-6 text-[14px] text-[var(--danger)]">{error}</div>}
      {!loading && !error && reportCards.length === 0 && (
        <div className="glass-card p-12 text-center"><FileText size={32} className="mx-auto mb-3 text-[var(--muted)]" /><p className="font-medium">Belum ada survei</p></div>
      )}
      {!loading && !error && reportCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportCards.map(({ survey, report }, index) => (
            <Reveal key={survey.id} delay={Math.min(index, 8) * 70}>
              <article className="glass-card flex h-full flex-col p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><FileText size={18} /></div>
                  {report ? <span className="badge bg-[#34c75914] text-[#1a7a32]"><CheckCircle2 size={13} className="mr-1 inline" /> Siap ditinjau</span> : <span className="badge bg-[var(--graphite-100)] text-[var(--muted)]">Belum tersedia</span>}
                </div>
                <h3 className="mb-2 text-[15px] font-semibold">{survey.supplierName}</h3>
                <div className="mb-5 flex items-center gap-2 text-[12px] text-[var(--muted)]"><Calendar size={13} /> Survei: {formatDate(survey.surveyDate)}</div>
                <div className="mt-auto flex gap-2">
                  <button className="btn-secondary flex-1" disabled={!report} onClick={() => report && setSelected({ survey, report })}>Lihat laporan</button>
                  <button className="btn-primary" disabled={!report || downloading} onClick={() => report && void downloadDocx({ survey, report })} title="Unduh DOCX"><Download size={16} /></button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}
      {selected && <ReportReview item={selected} onClose={() => setSelected(null)} onDownload={() => void downloadDocx(selected)} downloading={downloading} />}
    </div>
  );
}

function ReportReview({ item, onClose, onDownload, downloading }: { item: SelectedReport; onClose: () => void; onDownload: () => void; downloading: boolean }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-label="Pratinjau laporan">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[var(--canvas)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4"><div><p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Supplier Survey Report</p><h2 className="text-lg font-semibold">{item.survey.supplierName}</h2></div><button className="btn-secondary !px-3" onClick={onClose} aria-label="Tutup"><X size={17} /></button></div>
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-6 lg:grid-cols-2"><ReportLanguage title="Bahasa Indonesia" text={item.report.idText} /><ReportLanguage title="简体中文" text={item.report.zhText} /></div>
        <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] px-6 py-4"><button className="btn-secondary" onClick={onClose}>Tutup</button><button className="btn-primary" disabled={downloading} onClick={onDownload}>{downloading ? <LoaderCircle size={16} className="mr-2 inline animate-spin" /> : <Download size={16} className="mr-2 inline" />}Unduh DOCX</button></div>
      </div>
    </div>
  );
}

function ReportLanguage({ title, text }: { title: string; text: string }) {
  return <section className="rounded-2xl border border-[var(--line)] bg-white/70 p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Languages size={15} className="text-[var(--accent)]" />{title}</h3><div className="whitespace-pre-wrap text-[13px] leading-7 text-[var(--ink-soft)]">{text}</div></section>;
}
