import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";
import { CHAT_MODEL, MAX_AUDIO_BYTES, WHISPER_MODEL, callGroqChat, transcribeAudio } from "./groq.ts";
import { EXTRACTION_RULES, EXTRACTION_SCHEMA, REPORT_RULES } from "./prompts.ts";
import { mergeExtractions, sourceKey, splitTranscript } from "./extraction.ts";
import { MAX_DOCUMENT_CHARS, extractDocxText } from "./documents.ts";

type Supa = SupabaseClient;

export const SERVER_STAGES = ["transcribe", "reference", "documents", "extract", "report", "docx"] as const;
export type ServerStage = (typeof SERVER_STAGES)[number];

export const isServerStage = (value: unknown): value is ServerStage =>
  typeof value === "string" && (SERVER_STAGES as readonly string[]).includes(value);

const BUCKET = "survey-files";
const STALE_AFTER_MS = 5 * 60 * 1000;
const CHUNK_MAX_TOKENS = 900;
const REPORT_MAX_TOKENS = 6000;
const DOCUMENT_MODEL = "docx-parser";

interface SurveyFile {
  id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number;
}

interface RunRow {
  id: string;
  source_file_id: string | null;
  output: any;
}

interface SurveyRow {
  survey_date: string;
  location: string | null;
  product_name: string | null;
  survey_type: string | null;
  categories: string[] | null;
  contact_person: string | null;
  contact_info: string | null;
  objectives: string[] | null;
  field_notes: string | null;
  supplier: { name: string; address: string | null } | null;
}

async function listFiles(supa: Supa, surveyId: string, kind: string): Promise<SurveyFile[]> {
  const { data, error } = await supa
    .from("survey_files")
    .select("id, file_name, storage_path, size_bytes")
    .eq("survey_id", surveyId)
    .eq("kind", kind)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SurveyFile[];
}

async function runsFor(supa: Supa, surveyId: string, action: string): Promise<RunRow[]> {
  const { data, error } = await supa
    .from("survey_ai_runs")
    .select("id, source_file_id, output")
    .eq("survey_id", surveyId)
    .eq("action", action)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RunRow[];
}

async function latestRun(supa: Supa, surveyId: string, action: string): Promise<RunRow | null> {
  return (await runsFor(supa, surveyId, action))[0] ?? null;
}

async function saveRun(
  supa: Supa,
  row: { survey_id: string; action: string; model: string; output: unknown; source_file_id?: string },
) {
  const { data, error } = await supa.from("survey_ai_runs").insert(row).select("id").single();
  if (error) throw error;
  return data as { id: string };
}

async function loadSurvey(supa: Supa, surveyId: string): Promise<SurveyRow> {
  const { data, error } = await supa
    .from("surveys")
    .select("survey_date, location, product_name, survey_type, categories, contact_person, contact_info, objectives, field_notes, supplier:suppliers(name, address)")
    .eq("id", surveyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Survei tidak ditemukan.");
  return data as unknown as SurveyRow;
}

async function downloadFile(supa: Supa, file: SurveyFile): Promise<Blob> {
  const { data, error } = await supa.storage.from(BUCKET).download(file.storage_path);
  if (error || !data) throw new HttpError(502, `Berkas ${file.file_name} gagal dibaca dari penyimpanan.`);
  return data;
}

async function transcribeRecordings(supa: Supa, apiKey: string, surveyId: string) {
  const files = await listFiles(supa, surveyId, "recording");
  const done = new Set((await runsFor(supa, surveyId, "transcribe")).map((r) => r.source_file_id));
  for (const file of files) {
    if (done.has(file.id)) continue;
    if (file.size_bytes > MAX_AUDIO_BYTES) {
      throw new HttpError(413, `Rekaman ${file.file_name} melebihi 25 MB. Kompres ke MP3 lalu unggah ulang.`);
    }
    const audio = await downloadFile(supa, file);
    const output = await transcribeAudio(apiKey, audio, file.file_name);
    await saveRun(supa, {
      survey_id: surveyId,
      action: "transcribe",
      model: WHISPER_MODEL,
      source_file_id: file.id,
      output,
    });
  }
}

async function readStoredDocument(supa: Supa, file: SurveyFile) {
  if (!file.file_name.toLowerCase().endsWith(".docx")) {
    return { file_name: file.file_name, text: "", unsupported: true };
  }
  const text = await extractDocxText(await (await downloadFile(supa, file)).arrayBuffer());
  return { file_name: file.file_name, text: text.slice(0, MAX_DOCUMENT_CHARS), unsupported: false };
}

async function readReference(supa: Supa, surveyId: string) {
  if (await latestRun(supa, surveyId, "reference")) return;
  const [template] = await listFiles(supa, surveyId, "template");
  const output = template
    ? await readStoredDocument(supa, template)
    : { file_name: null, text: "", unsupported: false };
  await saveRun(supa, { survey_id: surveyId, action: "reference", model: DOCUMENT_MODEL, output });
}

async function readDocuments(supa: Supa, surveyId: string) {
  if (await latestRun(supa, surveyId, "documents")) return;
  const items = [];
  for (const file of await listFiles(supa, surveyId, "document")) {
    items.push(await readStoredDocument(supa, file));
  }
  await saveRun(supa, { survey_id: surveyId, action: "documents", model: DOCUMENT_MODEL, output: { items } });
}

async function buildSourceText(supa: Supa, surveyId: string, survey: SurveyRow): Promise<string> {
  const files = await listFiles(supa, surveyId, "recording");
  const latestByFile = new Map<string, RunRow>();
  for (const run of await runsFor(supa, surveyId, "transcribe")) {
    if (run.source_file_id && !latestByFile.has(run.source_file_id)) latestByFile.set(run.source_file_id, run);
  }

  const sections: string[] = [];
  files.forEach((file, index) => {
    const run = latestByFile.get(file.id);
    if (run) sections.push(`[Rekaman ${index + 1}: ${file.file_name}]\n${String(run.output?.text ?? "")}`);
  });
  if (survey.field_notes?.trim()) sections.push(`[Catatan lapangan]\n${survey.field_notes.trim()}`);

  const documents = await latestRun(supa, surveyId, "documents");
  for (const item of documents?.output?.items ?? []) {
    sections.push(
      item.unsupported
        ? `[Dokumen ${item.file_name}: tidak dapat dibaca otomatis]`
        : `[Dokumen: ${item.file_name}]\n${item.text}`,
    );
  }
  return sections.join("\n\n");
}

async function extract(supa: Supa, apiKey: string, surveyId: string) {
  const survey = await loadSurvey(supa, surveyId);
  const source = await buildSourceText(supa, surveyId, survey);
  if (!source.trim()) {
    throw new HttpError(400, "Tidak ada sumber untuk diekstrak. Tambahkan rekaman, catatan lapangan, atau dokumen.");
  }

  const chunks = splitTranscript(source);
  const key = sourceKey(source);
  const done = new Map<number, Record<string, any>>();
  for (const run of await runsFor(supa, surveyId, "extract-chunk")) {
    if (run.output?.source_key === key) done.set(run.output.chunk_index, run.output.result);
  }

  const parts: Record<string, any>[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let result = done.get(i);
    if (!result) {
      result = await callGroqChat(
        apiKey,
        `${EXTRACTION_RULES}\n\n${EXTRACTION_SCHEMA}`,
        { survey, source_part: { number: i + 1, total: chunks.length, text: chunks[i] } },
        CHUNK_MAX_TOKENS,
      );
      await saveRun(supa, {
        survey_id: surveyId,
        action: "extract-chunk",
        model: CHAT_MODEL,
        output: { chunk_index: i, source_key: key, result },
      });
    }
    parts.push(result);
  }

  await saveRun(supa, {
    survey_id: surveyId,
    action: "extract",
    model: CHAT_MODEL,
    output: { ...mergeExtractions(parts), chunk_count: chunks.length, source_key: key },
  });
}

async function report(supa: Supa, apiKey: string, surveyId: string) {
  const extraction = await latestRun(supa, surveyId, "extract");
  if (!extraction) throw new HttpError(400, "Belum ada hasil ekstraksi. Tahap ekstraksi belum selesai.");
  const reference = await latestRun(supa, surveyId, "reference");
  const survey = await loadSurvey(supa, surveyId);

  const output = await callGroqChat(
    apiKey,
    REPORT_RULES,
    {
      survey,
      extraction: extraction.output,
      reference_template: reference?.output?.text || null,
    },
    REPORT_MAX_TOKENS,
  );
  if (typeof output.id_text !== "string" || typeof output.zh_text !== "string") {
    throw new HttpError(502, "Respons laporan tidak lengkap.");
  }

  await saveRun(supa, {
    survey_id: surveyId,
    action: "report",
    model: CHAT_MODEL,
    output: { id_text: output.id_text, zh_text: output.zh_text, extraction_run_id: extraction.id },
  });
}

async function registerDocx(supa: Supa, surveyId: string, storagePath: string | undefined) {
  const folder = `${surveyId}/outputs`;
  const fileName = storagePath?.startsWith(`${folder}/`) ? storagePath.slice(folder.length + 1) : "";
  if (!/^[A-Za-z0-9._-]+\.docx$/.test(fileName)) throw new HttpError(400, "Berkas DOCX tidak valid.");

  const { data, error } = await supa.storage.from(BUCKET).list(folder, { search: fileName, limit: 10 });
  if (error) throw error;
  if (!(data ?? []).some((object) => object.name === fileName)) {
    throw new HttpError(400, "Berkas DOCX belum tersimpan di penyimpanan.");
  }

  const latest = await latestRun(supa, surveyId, "report");
  if (!latest) throw new HttpError(400, "Laporan belum tersedia untuk dibuatkan DOCX.");
  await saveRun(supa, {
    survey_id: surveyId,
    action: "docx",
    model: "docx-builder",
    output: { storage_path: storagePath, report_run_id: latest.id },
  });
}

async function executeStage(supa: Supa, apiKey: string, surveyId: string, stage: ServerStage, storagePath?: string) {
  switch (stage) {
    case "transcribe":
      return transcribeRecordings(supa, apiKey, surveyId);
    case "reference":
      return readReference(supa, surveyId);
    case "documents":
      return readDocuments(supa, surveyId);
    case "extract":
      return extract(supa, apiKey, surveyId);
    case "report":
      return report(supa, apiKey, surveyId);
    case "docx":
      return registerDocx(supa, surveyId, storagePath);
  }
}

export async function runStage(supa: Supa, apiKey: string, surveyId: string, stage: ServerStage, storagePath?: string) {
  const stageFilter = (query: ReturnType<Supa["from"]>) =>
    query.eq("survey_id", surveyId).eq("stage", stage);

  const { error: seedError } = await supa
    .from("survey_pipeline_stages")
    .upsert({ survey_id: surveyId, stage, status: "waiting" }, { onConflict: "survey_id,stage", ignoreDuplicates: true });
  if (seedError) throw seedError;

  const { data: current, error: readError } = await stageFilter(supa.from("survey_pipeline_stages").select("status")).maybeSingle();
  if (readError) throw readError;
  if (current?.status === "completed") return;

  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const { data: claimed, error: claimError } = await stageFilter(supa.from("survey_pipeline_stages"))
    .update({ status: "processing", started_at: now, completed_at: null, error_message: null, updated_at: now })
    .or(`status.neq.processing,updated_at.lt.${staleBefore}`)
    .select("id");
  if (claimError) throw claimError;
  if (!claimed || claimed.length === 0) {
    throw new HttpError(409, "Tahap ini sedang diproses. Tunggu sebentar lalu periksa kembali.");
  }

  try {
    await executeStage(supa, apiKey, surveyId, stage, storagePath);
  } catch (err) {
    const known = err instanceof HttpError;
    if (!known) console.error("Stage failed", stage, err);
    const message = known ? err.message : "Tahap ini gagal diproses. Silakan coba lagi.";
    const failedAt = new Date().toISOString();
    await stageFilter(supa.from("survey_pipeline_stages"))
      .update({ status: "failed", error_message: message, updated_at: failedAt });
    throw err;
  }

  const finishedAt = new Date().toISOString();
  const { error: doneError } = await stageFilter(supa.from("survey_pipeline_stages"))
    .update({ status: "completed", completed_at: finishedAt, updated_at: finishedAt });
  if (doneError) throw doneError;
}

export async function saveReviewedTranscript(supa: Supa, surveyId: string, text: unknown) {
  if (typeof text !== "string" || text.trim() === "") throw new HttpError(400, "Teks transkrip tidak boleh kosong.");
  if (text.length > 200000) throw new HttpError(413, "Teks transkrip terlalu panjang.");
  const original = await latestRun(supa, surveyId, "transcribe");
  if (!original) throw new HttpError(400, "Belum ada transkrip untuk dikoreksi.");

  await saveRun(supa, {
    survey_id: surveyId,
    action: "transcribe",
    model: "manual-review",
    source_file_id: original.source_file_id ?? undefined,
    output: { text: text.trim(), reviewed: true, source_run_id: original.id },
  });

  const now = new Date().toISOString();
  const { error } = await supa
    .from("survey_pipeline_stages")
    .update({ status: "waiting", error_message: null, completed_at: null, updated_at: now })
    .eq("survey_id", surveyId)
    .in("stage", ["extract", "report", "docx"]);
  if (error) throw error;
}
