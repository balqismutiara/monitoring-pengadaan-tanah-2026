# Perubahan – 21 Oktober 2026

## Data (src/data.ts, src/types.ts)
- Disusun ulang sesuai dokumen Tugas + Laporan Bulanan RKM 2026: 3 program, 14 task, 67 sub task.
- PIC per program: Kijing – Yayang Gunawan; NPEA – Novan Haditya; Monitoring & Asistensi Regional/Cabang – Alfiansyah Nur Arochman.
- Data RKM per program (ID, aktual vs baseline, Capaian, Isu, Next Step) dan ringkasan RKM keseluruhan (83% vs baseline 82%).
- Status baru `NOT_STARTED` (Belum Mulai) untuk item ❌ / 0%.
- `estimatedSchedule: true` = tanggal masih memakai rencana periode RKM (perlu dikoreksi).

## Logika (src/utils.ts, Notifications.tsx, MonitoringDashboard.tsx)
- Tanggal acuan = hari ini (sebelumnya dipatok 19 Jun / 20 Mei 2026).
- Donut status dashboard menampilkan "Belum Mulai".

## Laporan & Analitik (ReportsAnalytics.tsx, src/reportEngine.ts, src/reportExport.ts)
- Banner gauge meter realisasi RKM vs baseline + ringkasan eksekutif otomatis.
- Kartu per program: gauge, kondisi, Capaian / Isu (RKM + terdeteksi sistem) / Next Step, progres per task.
- Panel Capaian vs Pending (prioritas, ketergantungan, jatuh tempo).
- Panel Isu & Langkah Strategis (isu, dampak, langkah, PIC, target, prioritas).
- Skor kesehatan program terpadu (rumus tertulis di halaman).
- Export Laporan: (1) Laporan Lengkap PDF/Cetak, (2) Data Laporan Excel 7 sheet, (3) Data Analitik Excel (lama).

# Perubahan – 21 Oktober 2026 (tahap 2)

## Database MySQL (baru)
- `database/schema.sql` (tabel + view), `database/seed.sql` (data awal), `database/README.md` (panduan).
- Backend: `server/db.js`, `server/repository.js`, endpoint `/api/data`, `/api/programs`, `/api/sub-tasks/:id`,
  `/api/checklist`, `/api/activity` di `server/index.js`; `npm run db:setup` (server/setup.ts).
- Frontend (`src/api.ts`, `App.tsx`): data dimuat dari database setelah login dan setiap perubahan disimpan
  otomatis; indikator "Tersimpan di Database" / "Mode Lokal" di header. Vite mem-proxy `/api` ke port 3000.

## Manajemen Monitoring
- Hanya menampilkan pekerjaan yang masih berjalan; sub task 100% / Selesai disembunyikan
  (tombol "Tampilkan yang selesai").
- Edit di Manajemen kini menulis ke data pusat → Master Data, Dashboard, Laporan & database ikut terbarui.
- Kolom Tahapan & Target kini terbaca dari data (sebelumnya selalu "Pelaksanaan" / "-").

## Status Bahasa Indonesia
- Selesai · Proses · Belum Mulai · Tertunda di Master Data, Manajemen, Notifikasi, export.
- Aturan otomatis: progres 100% ⇒ Selesai; Selesai ⇒ 100%; Belum Mulai + progres > 0 ⇒ Proses.

## Checklist Tahapan
- Status dokumen disimpan per program (`src/checklist.ts`, tabel `program_stage_checklist`).
- Perencanaan s.d. Penyerahan Hasil ditandai Tersedia (kondisi eksisting); Pensertipikatan masih Belum Ada.
- Tombol "Tandai Ada" dan "Batalkan" selain Upload.

## Notifikasi
- Klik notifikasi membuka langsung sub task / task / program yang dirujuk (Manajemen atau Checklist).
