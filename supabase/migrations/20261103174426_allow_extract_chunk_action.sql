/*
# Simpan hasil ekstraksi per bagian transkrip

1. Tabel yang berubah
- `survey_ai_runs`: batasan nilai `action` ditambah `extract-chunk`, yaitu hasil ekstraksi untuk satu bagian transkrip.

2. Keamanan
- Tidak ada perubahan RLS atau grant.

3. Catatan
- Tidak ada data yang dihapus. Batasan lama diganti dengan batasan yang mencakup semua nilai lama ditambah satu nilai baru.
*/

ALTER TABLE survey_ai_runs DROP CONSTRAINT IF EXISTS survey_ai_runs_action_check;
ALTER TABLE survey_ai_runs ADD CONSTRAINT survey_ai_runs_action_check
  CHECK (action IN ('transcribe', 'extract', 'extract-chunk', 'report'));
