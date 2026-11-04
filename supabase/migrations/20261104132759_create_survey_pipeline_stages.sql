/*
# Track automatic processing stages per survey

1. New Tables
- `survey_pipeline_stages`: one row per survey and processing stage (transcribe, reference, documents, extract, report, docx).
  - `status` is waiting, processing, completed, or failed.
  - `error_message` keeps the last failure reason so the user can see it and retry.
  - `started_at` and `completed_at` record real durations, used for time estimates.

2. Modified tables
- `survey_ai_runs.action` now also accepts `reference` (reference report structure), `documents` (supporting document text), and `docx` (saved final DOCX file).

3. Security
- RLS enabled on `survey_pipeline_stages`.
- Anon and authenticated roles can read stage rows (shared team data, no sign-in yet).
- Only the server (service role, used by the edge function) can write stage rows.

4. Important notes
- No existing rows are removed or changed.
- The action list is widened, so every previously allowed value remains valid.
*/

ALTER TABLE survey_ai_runs DROP CONSTRAINT IF EXISTS survey_ai_runs_action_check;
ALTER TABLE survey_ai_runs ADD CONSTRAINT survey_ai_runs_action_check
  CHECK (action IN ('transcribe', 'extract', 'extract-chunk', 'report', 'reference', 'documents', 'docx'));

CREATE TABLE IF NOT EXISTS survey_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('transcribe', 'reference', 'documents', 'extract', 'report', 'docx')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'processing', 'completed', 'failed')),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, stage)
);

CREATE INDEX IF NOT EXISTS survey_pipeline_stages_survey_idx ON survey_pipeline_stages (survey_id);

ALTER TABLE survey_pipeline_stages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON survey_pipeline_stages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON survey_pipeline_stages TO service_role;

DROP POLICY IF EXISTS "select_survey_pipeline_stages" ON survey_pipeline_stages;
CREATE POLICY "select_survey_pipeline_stages" ON survey_pipeline_stages FOR SELECT
  TO anon, authenticated USING (true);
