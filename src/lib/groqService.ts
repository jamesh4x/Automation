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

export async function transcribeRecording(surveyId: string, fileId: string): Promise<void> {
  await invokeGroqAi({ action: 'transcribe', surveyId, fileId });
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
  await invokeGroqAi({ action: 'extract', surveyId });
}

export async function generateReport(surveyId: string): Promise<void> {
  await invokeGroqAi({ action: 'report', surveyId });
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
