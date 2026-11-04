import { createClient } from "npm:@supabase/supabase-js@2";
import { HttpError, corsHeaders, json } from "./http.ts";
import { checkStatus } from "./groq.ts";
import { isServerStage, runStage, saveReviewedTranscript } from "./stages.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) throw new HttpError(503, "GROQ_API_KEY belum dikonfigurasi di server.");

    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action === "status") return json({ status: await checkStatus(apiKey) });

    const surveyId = body?.surveyId;
    if (typeof surveyId !== "string" || !UUID_PATTERN.test(surveyId)) throw new HttpError(400, "ID survei tidak valid.");

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "run-stage") {
      if (!isServerStage(body?.stage)) throw new HttpError(400, "Tahap pemrosesan tidak dikenali.");
      const storagePath = typeof body?.storagePath === "string" ? body.storagePath : undefined;
      await runStage(supa, apiKey, surveyId, body.stage, storagePath);
      return json({ stage: body.stage, status: "completed" });
    }

    if (action === "save-transcript") {
      await saveReviewedTranscript(supa, surveyId, body?.text);
      return json({ ok: true });
    }

    throw new HttpError(400, "Aksi tidak dikenali.");
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Permintaan AI gagal diproses. Silakan coba lagi." }, 500);
  }
});
