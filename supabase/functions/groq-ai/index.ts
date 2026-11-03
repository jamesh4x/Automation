import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_BASE = "https://api.groq.com/openai/v1";
const WHISPER_MODEL = "whisper-large-v3";
const CHAT_MODEL = "llama-3.3-70b-versatile";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EXTRACTION_RULES = `Kamu membantu tim Purchasing mengekstrak informasi survei supplier.
Aturan wajib:
- Gunakan HANYA informasi yang tertulis di transkrip atau catatan lapangan yang diberikan.
- Jangan mengarang, menebak, atau melengkapi data yang tidak tertulis. Isi nilai yang tidak ada dengan null.
- Setiap nilai harus disertai kutipan singkat (quote) dari sumber asli. Jika tidak ada sumber, isi null.
- Jika transkrip dan catatan lapangan bertentangan, catat pertentangannya di "conflicts" dan jangan memilih salah satu.
- Tulis teks dalam bahasa Indonesia. Nama produk dan istilah teknis boleh tetap dalam bahasa aslinya.
- Balas HANYA dengan objek JSON yang valid.`;

const EXTRACTION_SCHEMA = `Bentuk JSON yang harus dikembalikan:
{
  "supplier": { "name": string|null, "address": string|null, "contact_person": string|null, "contact_info": string|null },
  "products": [ { "name": string|null, "specification": string|null, "price": string|null, "currency": string|null, "moq": string|null, "quote": string|null } ],
  "production_capacity": { "value": string|null, "quote": string|null },
  "payment_terms": { "value": string|null, "quote": string|null },
  "delivery_terms": { "value": string|null, "quote": string|null },
  "certifications": [ string ],
  "missing_information": [ string ],
  "conflicts": [ { "topic": string, "transcript": string, "field_notes": string } ]
}`;

const REPORT_RULES = `Kamu menyusun laporan survei supplier untuk tim Purchasing.
Aturan wajib:
- Gunakan HANYA data pada JSON hasil ekstraksi dan data survei yang diberikan. Dilarang menambah fakta.
- Setiap bagian yang bernilai null atau kosong harus ditulis sebagai "Belum tersedia (belum diverifikasi)" dalam bahasa yang sesuai.
- Tampilkan seluruh "conflicts" secara terbuka sebagai bagian "Perlu Verifikasi".
- Buat dua versi laporan dengan struktur yang sama: "id_text" dalam bahasa Indonesia, dan "zh_text" dalam bahasa Mandarin Sederhana.
- Balas HANYA dengan objek JSON: { "id_text": string, "zh_text": string }. Gunakan paragraf dan poin dengan baris baru (\\n).`;

async function callGroqChat(apiKey: string, system: string, user: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    }),
  });
  if (!res.ok) {
    console.error("Groq chat error", res.status, await res.text());
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

async function checkStatus(apiKey: string) {
  const res = await fetch(`${GROQ_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error("Groq models error", res.status, await res.text());
    throw new HttpError(502, `Koneksi ke Groq gagal (kode ${res.status}). Periksa GROQ_API_KEY.`);
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

async function saveReviewedTranscript(supabase: ReturnType<typeof createClient>, surveyId: string, text: unknown) {
  if (typeof text !== "string" || text.trim() === "") throw new HttpError(400, "Teks transkrip tidak boleh kosong.");
  if (text.length > 200000) throw new HttpError(413, "Teks transkrip terlalu panjang.");
  const original = await getLatestRun(supabase, surveyId, "transcribe");
  if (!original) throw new HttpError(400, "Belum ada transkrip untuk dikoreksi.");
  const { data: source } = await supabase
    .from("survey_ai_runs")
    .select("source_file_id")
    .eq("id", original.id)
    .maybeSingle();
  return saveRun(supabase, {
    survey_id: surveyId,
    action: "transcribe",
    model: "manual-review",
    source_file_id: source?.source_file_id ?? undefined,
    output: { text: text.trim(), reviewed: true, source_run_id: original.id },
  });
}

async function getLatestRun(supabase: ReturnType<typeof createClient>, surveyId: string, action: string) {
  const { data, error } = await supabase
    .from("survey_ai_runs")
    .select("id, output, created_at")
    .eq("survey_id", surveyId)
    .eq("action", action)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function saveRun(
  supabase: ReturnType<typeof createClient>,
  row: { survey_id: string; action: string; model: string; output: unknown; source_file_id?: string }
) {
  const { data, error } = await supabase
    .from("survey_ai_runs")
    .insert(row)
    .select("id, action, model, output, created_at")
    .single();
  if (error) throw error;
  return data;
}

async function transcribe(supabase: ReturnType<typeof createClient>, apiKey: string, surveyId: string, fileId: string | undefined) {
  if (!fileId || !UUID_PATTERN.test(fileId)) throw new HttpError(400, "Berkas rekaman tidak valid.");

  const { data: file, error } = await supabase
    .from("survey_files")
    .select("id, kind, storage_path, file_name, size_bytes")
    .eq("id", fileId)
    .eq("survey_id", surveyId)
    .maybeSingle();
  if (error) throw error;
  if (!file) throw new HttpError(404, "Berkas tidak ditemukan pada survei ini.");
  if (file.kind !== "recording") throw new HttpError(400, "Hanya rekaman yang dapat ditranskripsi.");
  if (file.size_bytes > MAX_AUDIO_BYTES) throw new HttpError(413, "Rekaman melebihi batas 25 MB untuk transkripsi.");

  const { data: blob, error: downloadError } = await supabase.storage.from("survey-files").download(file.storage_path);
  if (downloadError || !blob) throw new Error(`Download rekaman gagal: ${downloadError?.message}`);

  const form = new FormData();
  form.append("file", blob, file.file_name);
  form.append("model", WHISPER_MODEL);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    console.error("Groq whisper error", res.status, await res.text());
    throw new HttpError(502, `Layanan transkripsi menolak permintaan (kode ${res.status}).`);
  }
  const result = await res.json();
  if (typeof result?.text !== "string") throw new HttpError(502, "Respons transkripsi tidak sesuai format.");

  return saveRun(supabase, {
    survey_id: surveyId,
    action: "transcribe",
    model: WHISPER_MODEL,
    source_file_id: file.id,
    output: {
      text: result.text,
      language: result.language ?? null,
      duration_seconds: result.duration ?? null,
      segments: Array.isArray(result.segments)
        ? result.segments.map((s: { start: number; end: number; text: string }) => ({ start: s.start, end: s.end, text: s.text }))
        : [],
    },
  });
}

async function extract(supabase: ReturnType<typeof createClient>, apiKey: string, surveyId: string) {
  const transcript = await getLatestRun(supabase, surveyId, "transcribe");
  if (!transcript) throw new HttpError(400, "Belum ada transkrip. Jalankan transkripsi rekaman terlebih dahulu.");

  const { data: survey, error } = await supabase
    .from("surveys")
    .select("survey_date, location, product_name, survey_type, categories, contact_person, contact_info, objectives, field_notes, supplier:suppliers(name, address)")
    .eq("id", surveyId)
    .maybeSingle();
  if (error) throw error;
  if (!survey) throw new HttpError(404, "Survei tidak ditemukan.");

  const output = await callGroqChat(apiKey, `${EXTRACTION_RULES}\n\n${EXTRACTION_SCHEMA}`, {
    survey,
    transcript: transcript.output,
  });

  return saveRun(supabase, { survey_id: surveyId, action: "extract", model: CHAT_MODEL, output });
}

async function report(supabase: ReturnType<typeof createClient>, apiKey: string, surveyId: string) {
  const extraction = await getLatestRun(supabase, surveyId, "extract");
  if (!extraction) throw new HttpError(400, "Belum ada hasil ekstraksi. Jalankan ekstraksi terlebih dahulu.");

  const { data: survey, error } = await supabase
    .from("surveys")
    .select("survey_date, location, product_name, survey_type, objectives, field_notes, supplier:suppliers(name)")
    .eq("id", surveyId)
    .maybeSingle();
  if (error) throw error;
  if (!survey) throw new HttpError(404, "Survei tidak ditemukan.");

  const output = await callGroqChat(apiKey, REPORT_RULES, { survey, extraction: extraction.output });
  if (typeof output.id_text !== "string" || typeof output.zh_text !== "string") {
    throw new HttpError(502, "Respons laporan tidak lengkap.");
  }

  return saveRun(supabase, {
    survey_id: surveyId,
    action: "report",
    model: CHAT_MODEL,
    output: { id_text: output.id_text, zh_text: output.zh_text, extraction_run_id: extraction.id },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) throw new HttpError(503, "GROQ_API_KEY belum dikonfigurasi di server.");

    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action === "status") return json({ status: await checkStatus(apiKey) });

    if (!["transcribe", "save-transcript", "extract", "report"].includes(action)) throw new HttpError(400, "Aksi tidak dikenali.");
    const surveyId = body?.surveyId;
    if (typeof surveyId !== "string" || !UUID_PATTERN.test(surveyId)) throw new HttpError(400, "ID survei tidak valid.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const run =
      action === "transcribe"
        ? await transcribe(supabase, apiKey, surveyId, body?.fileId)
        : action === "save-transcript"
          ? await saveReviewedTranscript(supabase, surveyId, body?.text)
          : action === "extract"
            ? await extract(supabase, apiKey, surveyId)
            : await report(supabase, apiKey, surveyId);

    return json({ run });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Permintaan AI gagal diproses. Silakan coba lagi." }, 500);
  }
});
