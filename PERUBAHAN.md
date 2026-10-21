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
