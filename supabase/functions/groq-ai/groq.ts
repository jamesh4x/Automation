import { HttpError } from "./http.ts";

const GROQ_BASE = Deno.env.get("AI_BASE_URL") ?? "https://api.groq.com/openai/v1";
export const WHISPER_MODEL = Deno.env.get("AI_TRANSCRIPTION_MODEL") ?? "whisper-large-v3";
export const CHAT_MODEL = Deno.env.get("AI_TEXT_MODEL") ?? "openai/gpt-oss-120b";
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function callGroqChat(
  apiKey: string,
  system: string,
  user: unknown,
  maxCompletionTokens: number,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0,
      max_completion_tokens: maxCompletionTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    }),
  });
  if (!res.ok) {
    console.error("AI chat error", res.status, await res.text(), "model=", CHAT_MODEL);
    if (res.status === 404) throw new HttpError(502, "Model AI untuk penyusunan laporan tidak tersedia. Hubungi admin untuk memperbarui model.");
    if (res.status === 401 || res.status === 403) throw new HttpError(502, "Kunci layanan AI tidak valid. Periksa konfigurasi GROQ_API_KEY.");
    if (res.status === 413 || res.status === 429) throw new HttpError(429, "Batas layanan AI tercapai. Tahap ini akan dicoba ulang; tunggu sebentar lalu coba lagi.");
    throw new HttpError(502, `Layanan AI menolak permintaan (kode ${res.status}).`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new HttpError(502, "Respons AI tidak sesuai format.");
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new HttpError(502, "Respons AI tidak dapat dibaca sebagai data terstruktur.");
  }
}

export async function transcribeAudio(apiKey: string, audio: Blob, fileName: string) {
  const form = new FormData();
  form.append("file", audio, fileName);
  form.append("model", WHISPER_MODEL);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    console.error("Transcription error", res.status, await res.text());
    if (res.status === 413) throw new HttpError(413, `Rekaman ${fileName} terlalu besar untuk transkripsi. Kompres ke MP3 lalu unggah ulang.`);
    throw new HttpError(502, `Layanan transkripsi menolak permintaan (kode ${res.status}).`);
  }
  const result = await res.json();
  if (typeof result?.text !== "string") throw new HttpError(502, "Respons transkripsi tidak sesuai format.");
  return {
    text: result.text as string,
    language: (result.language ?? null) as string | null,
    duration_seconds: (result.duration ?? null) as number | null,
    segments: Array.isArray(result.segments)
      ? result.segments.map((s: { start: number; end: number; text: string }) => ({ start: s.start, end: s.end, text: s.text }))
      : [],
  };
}

export async function checkStatus(apiKey: string) {
  const res = await fetch(`${GROQ_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error("Models error", res.status, await res.text());
    throw new HttpError(502, `Koneksi ke layanan AI gagal (kode ${res.status}). Periksa GROQ_API_KEY.`);
  }
  const data = await res.json();
  const ids: string[] = Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id) : [];
  return {
    whisper_available: ids.includes(WHISPER_MODEL),
    chat_available: ids.includes(CHAT_MODEL),
    whisper_model: WHISPER_MODEL,
    chat_model: CHAT_MODEL,
    models_listed: ids.length,
  };
}
