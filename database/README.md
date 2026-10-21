# Database MySQL – Monitoring Pengadaan Tanah 2026

Semua perubahan dari **Master Data**, **Manajemen Monitoring**, dan **Checklist Tahapan** otomatis
tersimpan ke MySQL melalui backend Express (`server/`). Saat aplikasi dibuka, data diambil dari database.

```
Browser (Vite :3001) ──/api──▶ Express (:3000) ──▶ MySQL (:3306) database monitoring_pengadaan_tanah
```

## 1. Siapkan MySQL
Pilih salah satu: **XAMPP**, **Laragon**, atau **MySQL Server 8**. Pastikan service MySQL berjalan.

## 2. Isi koneksi di `.env.local`
Tambahkan baris berikut (sesuaikan password):
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=monitoring_pengadaan_tanah
PORT=3000
FRONTEND_URL=http://localhost:3001
```

## 3. Buat tabel & isi data awal (sekali saja)
```
npm install
npm run db:setup
```
Hasil yang benar: `Database "monitoring_pengadaan_tanah": 3 program · 14 task · 67 sub task · 69 checklist`.

- Database yang sudah berisi **tidak akan ditimpa**.
- Untuk mengosongkan & mengisi ulang data awal: `npm run db:setup -- --reset` (**semua perubahan hilang**).
- Alternatif tanpa terminal: di phpMyAdmin impor `database/schema.sql`, lalu `database/seed.sql`.

## 4. Jalankan aplikasi (2 terminal)
```
# Terminal 1 – backend
npm run server

# Terminal 2 – frontend
npm run dev
```
Cek backend: buka http://localhost:3000/api/health → `"database": true`.
Di header aplikasi akan muncul **"Tersimpan di Database"** (hijau). Bila muncul **"Mode Lokal"** (kuning),
backend/MySQL belum berjalan dan perubahan hanya tersimpan selama sesi.

## Pemetaan tabel

| Tabel | Isi | Dipakai di menu |
|---|---|---|
| `rkm_summary` | Header RKM: realisasi 83% vs baseline 82% | Laporan & Analitik |
| `programs` | Program, ID RKM, **PIC**, aktual/baseline RKM | Semua menu |
| `program_narratives` | Capaian / Isu / Next Step per program | Laporan & Analitik |
| `tasks` | Task list, jenis RKM/Non RKM, tahapan | Master Data, Manajemen |
| `sub_tasks` | Sub task: status, progres, PIC, mulai, target, keterangan | Master Data, Manajemen, Dashboard |
| `attachments` | Lampiran / link dokumen sub task | Arsip Dokumen |
| `stage_documents` | Master dokumen wajib per tahapan | Checklist Tahapan |
| `program_stage_checklist` | Status dokumen per program (Tersedia/Belum Ada) | Checklist Tahapan |
| `activity_log` | Riwayat setiap perubahan (siapa, kapan, nilai lama → baru) | Audit |
| `v_monitoring_aktif` (view) | Sub task yang **belum selesai** | Laporan SQL |
| `v_progres_program` (view) | Rekap progres per program | Laporan SQL |

Kode status di database → label di aplikasi:
`DONE` = **Selesai** · `WIP` = **Proses** · `NOT_STARTED` = **Belum Mulai** · `DELAYED` = **Tertunda**.

Aturan otomatis (di aplikasi & di server): progres 100% ⇒ Selesai; status Selesai ⇒ progres 100%;
Belum Mulai dengan progres > 0 ⇒ Proses. Kolom `completed_at` terisi saat sub task menjadi Selesai.

## Endpoint API

| Method | URL | Fungsi |
|---|---|---|
| GET | `/api/health` | Cek backend & database |
| GET | `/api/data` | Semua data (program → task → sub task, checklist, RKM) |
| PUT | `/api/programs` | Simpan seluruh data program (dipanggil otomatis oleh aplikasi) |
| PATCH | `/api/sub-tasks/:id` | Ubah satu sub task, mis. `{ "progress": 100 }` |
| PUT | `/api/checklist` | Simpan seluruh checklist |
| PUT | `/api/checklist/:programId/:documentKey` | Ubah satu dokumen checklist |
| GET | `/api/activity?limit=50` | Riwayat perubahan terbaru |

## Contoh query berguna
```sql
-- Pekerjaan yang masih berjalan, paling dekat jatuh tempo
SELECT program, sub_task, pic, status, progress, due_date FROM v_monitoring_aktif ORDER BY due_date;

-- Rekap per program
SELECT * FROM v_progres_program;

-- 20 perubahan terakhir
SELECT changed_at, changed_by, entity_id, field_name, old_value, new_value
FROM activity_log ORDER BY changed_at DESC LIMIT 20;
```

## Catatan
- File yang di-upload di Checklist/Manajemen saat ini hanya **nama file**-nya yang tersimpan; isi file belum
  diunggah ke server. Integrasi penyimpanan file (Google Drive) bisa ditambahkan berikutnya.
- Deploy Vercel hanya menjalankan frontend. Agar versi online juga tersimpan ke MySQL, backend `server/`
  perlu di-hosting (mis. VPS/server internal) dan alamatnya diisi di `VITE_API_URL`.
