import { supabase } from './supabase';

export interface GroqStatus {
  whisper_available: boolean;
  chat_available: boolean;
  whisper_model: string;
  chat_model: string;
  models_listed: number;
}

export interface TranscriptRecord {
  text: string;
  reviewed: boolean;
  createdAt: string;
}

const GENERIC_ERROR = 'Layanan AI belum dapat dihubungi. Silakan coba lagi.';

async function invokeGroqAi<T extends object>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('groq-ai', { body });

  if (error) {
    let message = GENERIC_ERROR;
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === 'function') {
      try {
        const payload = await response.clone().json();
        if (typeof payload?.error === 'string') message = payload.error;
      } catch {
        // response body was not JSON; keep the generic message
      }
    }
    throw new Error(message);
  }

  if (!data || typeof data !== 'object') throw new Error(GENERIC_ERROR);
  if ('error' in data && typeof (data as { error: unknown }).error === 'string') {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export async function testGroqConnection(): Promise<GroqStatus> {
  const payload = await invokeGroqAi<{ status?: GroqStatus }>({ action: 'status' });
  const status = payload.status;
  if (!status || typeof status.whisper_available !== 'boolean' || typeof status.chat_available !== 'boolean') {
    throw new Error('Respons koneksi Groq tidak sesuai format.');
  }
  return status;
}

export type PipelineStage = 'transcribe' | 'reference' | 'documents' | 'extract' | 'report' | 'docx';

export async function runAiStage(surveyId: string, stage: PipelineStage): Promise<void> {
  await invokeGroqAi({ action: 'run-stage', surveyId, stage });
}

export async function transcribeRecording(surveyId: string, fileId: string): Promise<void> {
  await invokeGroqAi({ action: 'run-stage', surveyId, stage: 'transcribe' });
}

export async function saveTranscript(surveyId: string, text: string): Promise<void> {
  await invokeGroqAi({ action: 'save-transcript', surveyId, text });
}

export async function fetchLatestTranscript(surveyId: string): Promise<TranscriptRecord | null> {
  const { data, error } = await supabase
    .from('survey_ai_runs')
    .select('output, created_at')
    .eq('survey_id', surveyId)
    .eq('action', 'transcribe')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(error);
    throw new Error('Transkrip belum dapat dimuat. Silakan coba lagi.');
  }
  if (!data) return null;

  const output = data.output as { text?: unknown; reviewed?: unknown };
  if (typeof output?.text !== 'string') throw new Error('Format transkrip tidak sesuai.');
  return { text: output.text, reviewed: output.reviewed === true, createdAt: data.created_at };
}

export async function extractSurvey(surveyId: string): Promise<void> {
  await invokeGroqAi({ action: 'run-stage', surveyId, stage: 'extract' });
}

export async function generateReport(surveyId: string): Promise<void> {
  await invokeGroqAi({ action: 'run-stage', surveyId, stage: 'report' });
}

export interface PipelineStageStatus {
  stage: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export async function fetchPipelineStages(surveyId: string): Promise<PipelineStageStatus[]> {
  const { data, error } = await supabase
    .from('survey_pipeline_stages')
    .select('stage, status, error_message, started_at, completed_at')
    .eq('survey_id', surveyId)
    .order('stage', { ascending: true });
  if (error) {
    console.error(error);
    throw new Error('Status pemrosesan belum dapat dimuat. Silakan coba lagi.');
  }
  return (data ?? []) as PipelineStageStatus[];
}

export async function fetchPipelineStagesBatch(surveyIds: string[]): Promise<Record<string, PipelineStageStatus[]>> {
  if (surveyIds.length === 0) return {};
  const { data, error } = await supabase
    .from('survey_pipeline_stages')
    .select('survey_id, stage, status, error_message, started_at, completed_at')
    .in('survey_id', surveyIds);
  if (error) {
    console.error(error);
    throw new Error('Status pemrosesan belum dapat dimuat.');
  }
  const map: Record<string, PipelineStageStatus[]> = {};
  for (const row of data ?? []) {
    (map[row.survey_id] ??= []).push({
      stage: row.stage,
      status: row.status,
      error_message: row.error_message,
      started_at: row.started_at,
      completed_at: row.completed_at,
    });
  }
  return map;
}

export async function fetchAiActions(surveyIds: string[]): Promise<Record<string, string[]>> {
  if (surveyIds.length === 0) return {};
  const { data, error } = await supabase
    .from('survey_ai_runs')
    .select('survey_id, action')
    .in('survey_id', surveyIds);
  if (error) {
    console.error(error);
    throw new Error('Status pemrosesan AI belum dapat dimuat.');
  }
  const actions: Record<string, string[]> = {};
  for (const row of data ?? []) {
    (actions[row.survey_id] ??= []).push(row.action);
  }
  return actions;
}

export interface ReportRecord {
  idText: string;
  zhText: string;
  createdAt: string;
}

export async function fetchLatestReports(surveyIds: string[]): Promise<Record<string, ReportRecord>> {
  const entries = await Promise.all(surveyIds.map(async (surveyId) => [surveyId, await fetchLatestReport(surveyId)] as const));
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, ReportRecord] => entry[1] !== null));
}

export async function fetchLatestReport(surveyId: string): Promise<ReportRecord | null> {
  const { data, error } = await supabase
    .from('survey_ai_runs')
    .select('output, created_at')
    .eq('survey_id', surveyId)
    .eq('action', 'report')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(error);
    throw new Error('Laporan belum dapat dimuat. Silakan coba lagi.');
  }
  if (!data) return null;

  const output = data.output as { id_text?: unknown; zh_text?: unknown };
  if (typeof output?.id_text !== 'string' || typeof output?.zh_text !== 'string') {
    throw new Error('Format laporan tidak sesuai.');
  }
  return { idText: output.id_text, zhText: output.zh_text, createdAt: data.created_at };
}

export async function buildAndUploadDocx(surveyId: string, supplierName: string, surveyDate: string, report: ReportRecord): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph } = await import('docx');
  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const buildParagraphs = (text: string) =>
    text.split('\n').map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) return new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 });
      if (trimmed.startsWith('## ')) return new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 });
      if (trimmed.startsWith('- ')) return new Paragraph({ text: trimmed.slice(2), bullet: { level: 0 } });
      return new Paragraph(trimmed || '');
    });

  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ text: `Supplier Survey Report — ${supplierName}`, heading: HeadingLevel.TITLE }),
        new Paragraph({ text: `Tanggal survei: ${formatDate(surveyDate)}` }),
        new Paragraph({ text: 'Laporan Bahasa Indonesia', heading: HeadingLevel.HEADING_1 }),
        ...buildParagraphs(report.idText),
        new Paragraph({ text: 'Supplier Survey Report — 简体中文', heading: HeadingLevel.HEADING_1 }),
        ...buildParagraphs(report.zhText),
      ],
    }],
  });

  const blob = await Packer.toBlob(document);
  const fileName = `report-${supplierName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.docx`;
  const storagePath = `${surveyId}/outputs/${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from('survey-files')
    .upload(storagePath, blob, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true });
  if (uploadError) throw new Error('Gagal mengunggah dokumen DOCX ke penyimpanan.');

  await invokeGroqAi({ action: 'run-stage', surveyId, stage: 'docx', storagePath });
}

export async function downloadDocxFile(surveyId: string): Promise<void> {
  const { data, error } = await supabase
    .from('survey_ai_runs')
    .select('output')
    .eq('survey_id', surveyId)
    .eq('action', 'docx')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('Dokumen laporan belum dapat ditemukan.');
  const output = data?.output as { storage_path?: unknown } | null;
  if (!output || typeof output.storage_path !== 'string') {
    throw new Error('Dokumen DOCX belum tersedia.');
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from('survey-files')
    .download(output.storage_path);
  if (downloadError || !blob) throw new Error('Gagal mengunduh dokumen DOCX.');

  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = output.storage_path.split('/').pop() ?? 'report.docx';
  link.click();
  URL.revokeObjectURL(url);
}
