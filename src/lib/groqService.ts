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
