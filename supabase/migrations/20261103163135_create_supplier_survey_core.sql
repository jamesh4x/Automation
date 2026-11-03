/*
# Create supplier survey core tables and private file storage

1. New Tables
- `suppliers`: one profile per supplier (name, address, province, regency, GPS coordinates, categories, contact, status, notes). Name is unique (case-insensitive) so repeat visits attach to the same supplier.
- `surveys`: one row per visit to a supplier (date, location, product, survey type, contact person, objectives, field notes, report status).
- `survey_team_members`: team members per survey with optional position or responsibility.
- `survey_files`: metadata for uploaded recordings, photos, supplier documents, and report templates. The file itself lives in the `survey-files` storage bucket.

2. Storage
- Private bucket `survey-files` (not public), 500 MB per file limit, with an allowlist of audio, video, image, PDF, DOCX, and XLSX MIME types.

3. Security
- Row level security enabled on every new table.
- Single-tenant app (no sign-in screen): policies grant `anon` and `authenticated` only the verbs the app uses. No UPDATE or DELETE policy on surveys, survey files, or team members. Suppliers allow UPDATE for later edits; no DELETE.
- Storage policies allow uploads and reads only inside the `survey-files` bucket. No delete policy, so stored files cannot be removed through the app.
- Known limitation: until sign-in is added, anyone with the app address can read and write this data.

4. Notes
- Statements are idempotent (IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT) so the migration is safe to re-run.
- No existing data is modified or removed.
*/

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  address text,
  province text,
  regency text,
  latitude double precision CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  longitude double precision CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
  categories text[] NOT NULL DEFAULT '{}',
  contact_person text,
  contact_info text,
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'tidak aktif', 'evaluasi')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_name_unique_idx ON suppliers (lower(btrim(name)));
CREATE INDEX IF NOT EXISTS suppliers_province_idx ON suppliers (province);

CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  survey_date date NOT NULL,
  location text,
  product_name text,
  survey_type text,
  categories text[] NOT NULL DEFAULT '{}',
  contact_person text,
  contact_info text,
  objectives text[] NOT NULL DEFAULT '{}',
  field_notes text,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'generated', 'needs_review', 'approved', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS surveys_supplier_id_idx ON surveys (supplier_id);
CREATE INDEX IF NOT EXISTS surveys_survey_date_idx ON surveys (survey_date DESC);

CREATE TABLE IF NOT EXISTS survey_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  role text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survey_team_members_survey_id_idx ON survey_team_members (survey_id);

CREATE TABLE IF NOT EXISTS survey_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('recording', 'photo', 'document', 'template')),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survey_files_survey_id_idx ON survey_files (survey_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_files ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON suppliers TO anon, authenticated;
GRANT SELECT, INSERT ON surveys TO anon, authenticated;
GRANT SELECT, INSERT ON survey_team_members TO anon, authenticated;
GRANT SELECT, INSERT ON survey_files TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_suppliers" ON suppliers;
CREATE POLICY "anon_select_suppliers" ON suppliers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_suppliers" ON suppliers;
CREATE POLICY "anon_insert_suppliers" ON suppliers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_suppliers" ON suppliers;
CREATE POLICY "anon_update_suppliers" ON suppliers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_surveys" ON surveys;
CREATE POLICY "anon_select_surveys" ON surveys FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_surveys" ON surveys;
CREATE POLICY "anon_insert_surveys" ON surveys FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_survey_team_members" ON survey_team_members;
CREATE POLICY "anon_select_survey_team_members" ON survey_team_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_survey_team_members" ON survey_team_members;
CREATE POLICY "anon_insert_survey_team_members" ON survey_team_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_survey_files" ON survey_files;
CREATE POLICY "anon_select_survey_files" ON survey_files FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_survey_files" ON survey_files;
CREATE POLICY "anon_insert_survey_files" ON survey_files FOR INSERT
  TO anon, authenticated WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-files',
  'survey-files',
  false,
  524288000,
  ARRAY[
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/flac',
    'video/mp4', 'video/quicktime', 'video/webm',
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "anon_insert_survey_files_objects" ON storage.objects;
CREATE POLICY "anon_insert_survey_files_objects" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'survey-files');

DROP POLICY IF EXISTS "anon_select_survey_files_objects" ON storage.objects;
CREATE POLICY "anon_select_survey_files_objects" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'survey-files');
