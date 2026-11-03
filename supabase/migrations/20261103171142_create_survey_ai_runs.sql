/*
# Create survey_ai_runs

1. New Tables
- `survey_ai_runs`: one row per AI step run on a survey. Stores the transcript, the extracted supplier details, and the generated report, so results survive refresh.
  - `id` (uuid, primary key)
  - `survey_id` (uuid, references surveys, cascades on delete)
  - `source_file_id` (uuid, optional, references survey_files; set when the step reads an uploaded recording)
  - `action` (text: transcribe, extract, or report)
  - `model` (text, the Groq model that produced the output)
  - `output` (jsonb, the result of the step)
  - `created_at` (timestamptz)

2. Security
- RLS enabled.
- Anon and authenticated roles can read rows (the app has no sign-in yet and survey data is shared inside the team).
- Only the server (service role, used by the edge function) can insert rows. No client insert, update, or delete.
*/

CREATE TABLE IF NOT EXISTS survey_ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  source_file_id uuid REFERENCES survey_files(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('transcribe', 'extract', 'report')),
  model text NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survey_ai_runs_survey_action_idx ON survey_ai_runs (survey_id, action, created_at DESC);

ALTER TABLE survey_ai_runs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON survey_ai_runs TO anon, authenticated;
GRANT SELECT, INSERT ON survey_ai_runs TO service_role;

DROP POLICY IF EXISTS "select_survey_ai_runs" ON survey_ai_runs;
CREATE POLICY "select_survey_ai_runs" ON survey_ai_runs FOR SELECT
  TO anon, authenticated USING (true);
