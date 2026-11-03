/*
# Tambah kolom Divisi pada survei

1. Tabel yang berubah
- `surveys`: kolom baru `division` (text, boleh kosong) untuk mencatat divisi peminta survei.

2. Keamanan
- Tidak ada perubahan RLS atau grant. Kolom baru mengikuti hak akses tabel `surveys` yang sudah ada.

3. Catatan
- Migrasi ini hanya menambah kolom. Tidak ada data yang dihapus atau diubah.
*/

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS division text;
