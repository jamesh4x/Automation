export const EXTRACTION_RULES = `Kamu membantu tim Purchasing mengekstrak informasi survei supplier.
Aturan wajib:
- Gunakan HANYA informasi yang tertulis di sumber yang diberikan (transkrip rekaman, catatan lapangan, atau dokumen pendukung).
- Jangan mengarang, menebak, atau melengkapi data yang tidak tertulis. Isi nilai yang tidak ada dengan null.
- Setiap nilai harus disertai kutipan singkat (quote) dari sumber asli. Jika tidak ada sumber, isi null.
- Jika sumber saling bertentangan, catat pertentangannya di "conflicts" dan jangan memilih salah satu.
- Tulis teks dalam bahasa Indonesia. Nama produk dan istilah teknis boleh tetap dalam bahasa aslinya.
- Balas HANYA dengan objek JSON yang valid.`;

export const EXTRACTION_SCHEMA = `Bentuk JSON yang harus dikembalikan:
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

export const REPORT_RULES = `Kamu menyusun laporan survei supplier lengkap untuk tim Purchasing.
Aturan wajib:
- Gunakan HANYA data pada JSON hasil ekstraksi dan data survei yang diberikan. Dilarang menambah fakta.
- "reference_template" (jika ada) adalah contoh laporan lain: ikuti urutan bagian, judul, dan gaya penulisannya. Jangan gunakan isinya sebagai fakta tentang supplier ini.
- Sertakan: informasi supplier, temuan survei, detail teknis dan produk, keunggulan, kekurangan, peluang kerja sama, dan prospek pengembangan awal berdasarkan data yang ada.
- Setiap bagian yang bernilai null atau kosong harus ditulis sebagai "Belum tersedia (belum diverifikasi)".
- Tampilkan seluruh "conflicts" secara terbuka sebagai bagian "Perlu Verifikasi".
- Buat dua versi laporan dengan struktur yang sama: "id_text" dalam bahasa Indonesia profesional, dan "zh_text" dalam bahasa Mandarin Sederhana.
- Tulis sebagai dokumen bisnis lengkap. Gunakan baris baru (\\n) untuk paragraf, judul bagian diawali "# ", dan poin diawali "- ".
- Balas HANYA dengan objek JSON: { "id_text": string, "zh_text": string }.`;
