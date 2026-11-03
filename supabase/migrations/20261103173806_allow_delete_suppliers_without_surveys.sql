/*
# Izinkan hapus supplier yang belum punya survei

1. Tabel yang berubah
- `suppliers`: kebijakan hapus baru.

2. Keamanan
- Grant DELETE untuk anon dan authenticated sudah ada sejak awal.
- Kebijakan hapus hanya mengizinkan penghapusan supplier yang tidak memiliki satu pun survei.
- Supplier yang punya survei tetap tidak bisa dihapus, sehingga riwayat survei tidak ikut hilang.

3. Catatan
- Tidak ada data yang dihapus oleh migrasi ini.
*/

DROP POLICY IF EXISTS "anon_delete_suppliers_without_surveys" ON suppliers;
CREATE POLICY "anon_delete_suppliers_without_surveys" ON suppliers FOR DELETE
TO anon, authenticated
USING (NOT EXISTS (SELECT 1 FROM surveys WHERE surveys.supplier_id = suppliers.id));
