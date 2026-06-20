import { Program } from './types';

export const INITIAL_PROGRAMS: Program[] = [
  {
    id: "PRG-01",
    name: "Pengadaan Tanah Terminal Kijing",
    tasks: [
      {
        id: "TSK-01A",
        name: "Konsinyasi dan Pengosongan Makam Tionghoa (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-01A1",
            name: "Pengambilan UGR Ahli Waris di PN Mempawah",
            status: "DONE",
            progress: 100,
            pic: "Ahmad Sujatmiko",
            startDate: "2026-01-15",
            dueDate: "2026-03-15",
            notes: "Uang Ganti Kerugian (UGR) telah diambil seluruh ahli waris di PN Mempawah."
          },
          {
            id: "SUB-01A2",
            name: "Permohonan Pendampingan oleh Kejati Kalbar",
            status: "DONE",
            progress: 100,
            pic: "Ahmad Sujatmiko",
            startDate: "2026-02-01",
            dueDate: "2026-04-10",
            notes: "Kejati Kalbar telah memberikan pendampingan hukum penuh."
          },
          {
            id: "SUB-01A3",
            name: "Pemindahan Makam oleh Ahli Waris",
            status: "WIP",
            progress: 40,
            pic: "Dewi Lestari",
            startDate: "2026-04-15",
            dueDate: "2026-07-20",
            notes: "Pemindahan makam sedang berjalan bertahap oleh keluarga ahli waris."
          },
          {
            id: "SUB-01A4",
            name: "Land Clearing Lahan",
            status: "WIP",
            progress: 20,
            pic: "Andi Wijaya",
            startDate: "2026-05-01",
            dueDate: "2026-08-15",
            notes: "Eksekusi land clearing paralel dengan pemindahan makam yang selesai."
          }
        ]
      },
      {
        id: "TSK-01B",
        name: "Relokasi Aset Pemerintah Desa (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-01B1",
            name: "Kontrak Pekerjaan Pembangunan Aset Desa",
            status: "DONE",
            progress: 100,
            pic: "Dewi Lestari",
            startDate: "2026-02-10",
            dueDate: "2026-04-01",
            notes: "Tandatangan kerja sama dengan kontraktor pelaksana relokasi."
          },
          {
            id: "SUB-01B2",
            name: "Pelaksanaan Pekerjaan Pembangunan Aset Desa",
            status: "WIP",
            progress: 60,
            pic: "Dewi Lestari",
            startDate: "2026-04-05",
            dueDate: "2026-07-30",
            notes: "Konstruksi fisik relokasi balai desa dan fasilitas umum mencapai 60%."
          },
          {
            id: "SUB-01B3",
            name: "Serah Terima Aset Desa",
            status: "DELAYED",
            progress: 0,
            pic: "Dewi Lestari",
            startDate: "2026-05-10",
            dueDate: "2026-05-15",
            notes: "Terlambat. Terhambat karena administrasi persetujuan bupati yang belum turun."
          }
        ]
      },
      {
        id: "TSK-01C",
        name: "Pendaftaran Pensertipikatan RJN (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-01C1",
            name: "Penyerahan Hasil Pengadaan Tanah RJN",
            status: "DONE",
            progress: 100,
            pic: "Budi Santoso",
            startDate: "2026-03-01",
            dueDate: "2026-05-10",
            notes: "Dokumen pengadaan RJN telah diserahkan lengkap ke instansi terkait."
          },
          {
            id: "SUB-01C2",
            name: "Monitoring Pelaksanaan Pekerjaan Pembangunan RJN",
            status: "WIP",
            progress: 50,
            pic: "Budi Santoso",
            startDate: "2026-05-15",
            dueDate: "2026-09-10",
            notes: "Pembangunan RJN terus dimonitoring bersama dinas PUPR."
          }
        ]
      },
      {
        id: "TSK-01D",
        name: "Pensertipikatan HGB di atas HPL Konsesi (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-01D1",
            name: "Permohonan Pengukuran Bidang Tanah",
            status: "DONE",
            progress: 100,
            pic: "Budi Santoso",
            startDate: "2026-01-10",
            dueDate: "2026-02-20",
            notes: "Pengukuran bidang tanah selesai diproses oleh BPN."
          },
          {
            id: "SUB-01D2",
            name: "Pembayaran PNBP Pengukuran dan Pemetaan Bidang Tanah",
            status: "DONE",
            progress: 100,
            pic: "Budi Santoso",
            startDate: "2026-02-25",
            dueDate: "2026-03-05",
            notes: "PNBP pengukuran lunas terbayar."
          },
          {
            id: "SUB-01D3",
            name: "Penunjukan Notaris/ PPAT Pengurusan Pensertipikatan",
            status: "DELAYED",
            progress: 0,
            pic: "Budi Santoso",
            startDate: "2026-03-10",
            dueDate: "2026-04-20",
            notes: "Terlambat. Proses pengadaan notaris terhambat regulasi internal perusahaan."
          },
          {
            id: "SUB-01D4",
            name: "Pembayaran PNBP terkait Pensertipikatan",
            status: "DELAYED",
            progress: 0,
            pic: "Budi Santoso",
            startDate: "2026-04-25",
            dueDate: "2026-05-10",
            notes: "Terlambat. Menunggu penunjukan Notaris/PPAT yang sah."
          },
          {
            id: "SUB-01D5",
            name: "BPHTB HGB Konsesi",
            status: "DELAYED",
            progress: 0,
            pic: "Ahmad Sujatmiko",
            startDate: "2026-05-12",
            dueDate: "2026-05-30",
            notes: "Terlambat. Dokumen pendukung untuk penetapan BPHTB belum lengkap."
          },
          {
            id: "SUB-01D6",
            name: "Penerbitan SK HGB Konsesi",
            status: "DELAYED",
            progress: 0,
            pic: "Budi Santoso",
            startDate: "2026-06-01",
            dueDate: "2026-06-10",
            notes: "Terlambat. Menunggu kelengkapan berkas BPHTB dan rekomendasi Kanwil BPN."
          },
          {
            id: "SUB-01D7",
            name: "Penerbitan Sertipikat HGB Konsesi",
            status: "DELAYED",
            progress: 0,
            pic: "Budi Santoso",
            startDate: "2026-06-11",
            dueDate: "2026-06-15",
            notes: "Terlambat. Bergantung pada penerbitan SK HGB Konsesi."
          }
        ]
      }
    ]
  },
  {
    id: "PRG-02",
    name: "Pengadaan Tanah NPEA",
    tasks: [
      {
        id: "TSK-02A",
        name: "Relokasi Aset TNI AL/ Tukar Menukar BMN TNI AL (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-02A1",
            name: "BA Kesepakatan Lokasi Tanah dan Bangunan Pengganti",
            status: "DONE",
            progress: 100,
            pic: "Rahmat Hidayat",
            startDate: "2026-01-05",
            dueDate: "2026-01-20",
            notes: "BAK disepakati dan ditandatangani oleh Danlantamal terkait."
          },
          {
            id: "SUB-02A2",
            name: "Perolehan Ijin Prinsip Tukar Menukar",
            status: "WIP",
            progress: 30,
            pic: "Rahmat Hidayat",
            startDate: "2026-02-01",
            dueDate: "2026-07-15",
            notes: "Koordinasi aktif dengan Mabes AL dan Kementerian Keuangan sedang berjalan."
          },
          {
            id: "SUB-02A3",
            name: "Perolehan Ijin Pelaksanaan Tukar Menukar",
            status: "DELAYED",
            progress: 0,
            pic: "Rahmat Hidayat",
            startDate: "2026-03-15",
            dueDate: "2026-05-01",
            notes: "Terlambat. Menunggu ijin prinsip keluar terlebih dahulu."
          },
          {
            id: "SUB-02A4",
            name: "PKS Tukar Menukar",
            status: "WIP",
            progress: 25,
            pic: "Siti Rahmawati",
            startDate: "2026-04-10",
            dueDate: "2026-08-30",
            notes: "Penyusunan draf PKS bersama Tim Aset TNI AL."
          },
          {
            id: "SUB-02A5",
            name: "Permohonan LO dan/ atau LA dari Kejaksaan",
            status: "WIP",
            progress: 40,
            pic: "Ahmad Sujatmiko",
            startDate: "2026-05-01",
            dueDate: "2026-08-15",
            notes: "Ekspose perkara telah dilakukan, menunggu Legal Opinion tertulis Kejaksaan Agung."
          },
          {
            id: "SUB-02A6",
            name: "DPPT Tanah Pengganti (Tj Pinang, Pontianak, Merauke)",
            status: "DONE",
            progress: 100,
            pic: "Rahmat Hidayat",
            startDate: "2025-11-15",
            dueDate: "2026-02-15",
            notes: "DPPT selesai disusun dan telah diajukan ke masing-masing gubernur."
          },
          {
            id: "SUB-02A7",
            name: "Penilaian Tanah Pengganti",
            status: "DONE",
            progress: 100,
            pic: "Rahmat Hidayat",
            startDate: "2026-02-20",
            dueDate: "2026-03-20",
            notes: "Kantor Jasa Penilai Publik (KJPP) telah merilis nilai taksiran."
          },
          {
            id: "SUB-02A8",
            name: "Pelaksanaan Pengadaan Tanah Pengganti",
            status: "WIP",
            progress: 50,
            pic: "Rahmat Hidayat",
            startDate: "2026-04-01",
            dueDate: "2026-09-30",
            notes: "Sedang sosialisasi ke pemilik lahan di Tanjung Pinang dan Pontianak."
          },
          {
            id: "SUB-02A9",
            name: "Kesepakatan Bentuk dan Design Bangunan Pengganti",
            status: "WIP",
            progress: 45,
            pic: "Dewi Lestari",
            startDate: "2026-04-15",
            dueDate: "2026-09-01",
            notes: "Design mess dan kantor perwakilan TNI AL sedang difinalisasi."
          },
          {
            id: "SUB-02A10",
            name: "Monitoring Pekerjaan Bangunan Pengganti",
            status: "DELAYED",
            progress: 0,
            pic: "Dewi Lestari",
            startDate: "2026-05-01",
            dueDate: "2026-06-05",
            notes: "Terlambat. Pembangunan fisik belum dapat dimulai sebelum PKS ditandatangani."
          },
          {
            id: "SUB-02A11",
            name: "Serah Terima Aset",
            status: "DELAYED",
            progress: 0,
            pic: "Rahmat Hidayat",
            startDate: "2026-06-01",
            dueDate: "2026-06-18",
            notes: "Terlambat. Terhambat oleh progres pembangunan fisik pengganti yang nol."
          }
        ]
      },
      {
        id: "TSK-02B",
        name: "Relokasi Aset/ Pemberian Ganti Kerugian Bentuk Lain PT KBN (RKM) (Bidang 22 dan 27)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-02B1",
            name: "PKS Pemberian Ganti Kerugian Dalam Bentuk Lain dengan PT KBN",
            status: "DONE",
            progress: 100,
            pic: "Siti Rahmawati",
            startDate: "2026-02-15",
            dueDate: "2026-04-10",
            notes: "PKS telah ditandatangani kedua belah pihak."
          },
          {
            id: "SUB-02B2",
            name: "Pembayaran Uang Pengganti",
            status: "DONE",
            progress: 100,
            pic: "Siti Rahmawati",
            startDate: "2026-04-12",
            dueDate: "2026-05-01",
            notes: "Pembayaran ganti rugi bentuk lain telah lunas ditransfer."
          },
          {
            id: "SUB-02B3",
            name: "Monitoring Pekerjaan Bangunan Pengganti",
            status: "WIP",
            progress: 40,
            pic: "Dewi Lestari",
            startDate: "2026-05-05",
            dueDate: "2026-10-15",
            notes: "Konstruksi gudang pengganti PT KBN sedang berjalan kondusif."
          }
        ]
      },
      {
        id: "TSK-02C",
        name: "Pendaftaran Pensertipikatan Hasil Pengadaan Tanah NPEA (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-02C1",
            name: "Penyerahan Hasil Pengadaan Tanah (parsial)",
            status: "DONE",
            progress: 100,
            pic: "Budi Santoso",
            startDate: "2026-02-01",
            dueDate: "2026-04-15",
            notes: "Berkas parsial diserahkan ke Kantor Pertanahan Jakarta Utara."
          },
          {
            id: "SUB-02C2",
            name: "Pemecahan bidang tanah",
            status: "WIP",
            progress: 30,
            pic: "Budi Santoso",
            startDate: "2026-04-20",
            dueDate: "2026-08-15",
            notes: "Pengukuran untuk pemecahan sertipikat induk sedang berjalan di lapangan."
          },
          {
            id: "SUB-02C3",
            name: "Penunjukan Notaris/ PPAT Pengurusan Pensertipikatan",
            status: "DELAYED",
            progress: 0,
            pic: "Budi Santoso",
            startDate: "2026-05-01",
            dueDate: "2026-05-25",
            notes: "Terlambat. Ada pembatalan pemenang pengadaan vendor sebelumnya, diulang kembali."
          }
        ]
      },
      {
        id: "TSK-02D",
        name: "Konsinyasi dan Pengosongan Lahan (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-02D1",
            name: "Pendaftaran dan Pembayaran UGR Konsinyasi ke PN Jakut",
            status: "DONE",
            progress: 100,
            pic: "Ahmad Sujatmiko",
            startDate: "2026-02-20",
            dueDate: "2026-04-25",
            notes: "Dana konsinyasi telah ditempatkan di rekening pengadilan PN Jakut."
          },
          {
            id: "SUB-02D2",
            name: "Penetapan Pengadilan terkait Konsinyasi",
            status: "WIP",
            progress: 50,
            pic: "Ahmad Sujatmiko",
            startDate: "2026-05-01",
            dueDate: "2026-07-25",
            notes: "Sidang pembacaan penetapan dijadwalkan akhir Juni."
          },
          {
            id: "SUB-02D3",
            name: "Monitoring pengambilan UGR Konsinyasi oleh PYB di Pengadilan Jakut",
            status: "WIP",
            progress: 35,
            pic: "Ahmad Sujatmiko",
            startDate: "2026-05-10",
            dueDate: "2026-08-20",
            notes: "Sebagian Pihak Yang Berhak (PYB) mulai melengkapi dokumen klaim."
          },
          {
            id: "SUB-02D4",
            name: "Pengosongan Lahan",
            status: "WIP",
            progress: 20,
            pic: "Andi Wijaya",
            startDate: "2026-05-25",
            dueDate: "2026-09-15",
            notes: "Persiapan Satpol PP dan kepolisian untuk pengamanan pembersihan lahan."
          }
        ]
      },
      {
        id: "TSK-02E",
        name: "Perpanjangan Penlok NPEA (Non RKM)",
        type: "NON_RKM",
        subTasks: [
          {
            id: "SUB-02E1",
            name: "Permohonan rekomendasi perpanjangan penlok ke Kanwil BPN DKI Jakarta",
            status: "DONE",
            progress: 100,
            pic: "Siti Rahmawati",
            startDate: "2026-01-10",
            dueDate: "2026-03-10",
            notes: "Rekomendasi teknis Kanwil BPN DKI Jakarta selesai diterbitkan."
          },
          {
            id: "SUB-02E2",
            name: "Rekomendasi perpanjangan penlok dari Kanwil BPN DKI Jakarta",
            status: "WIP",
            progress: 50,
            pic: "Siti Rahmawati",
            startDate: "2026-03-15",
            dueDate: "2026-07-10",
            notes: "BPN sedang memverifikasi luasan bidang sisa pengadaan."
          },
          {
            id: "SUB-02E3",
            name: "Permohonan perpanjangan penlok ke Gubernur DKI Jakarta",
            status: "DELAYED",
            progress: 0,
            pic: "Siti Rahmawati",
            startDate: "2026-04-10",
            dueDate: "2026-05-15",
            notes: "Terlambat. Surat permohonan ke gubernur tertunda menunggu kelengkapan verifikasi BPN."
          },
          {
            id: "SUB-02E4",
            name: "SK Perpanjangan penlok dari Gubernur DKI Jakarta",
            status: "DELAYED",
            progress: 0,
            pic: "Siti Rahmawati",
            startDate: "2026-05-20",
            dueDate: "2026-06-10",
            notes: "Terlambat. Biro Hukum DKI tidak bisa memproses SK tanpa permohonan resmi draf BPN."
          }
        ]
      }
    ]
  },
  {
    id: "PRG-03",
    name: "Monitoring dan Asistensi Tahapan Pengadaan Tanah Regional/Cabang",
    tasks: [
      {
        id: "TSK-031",
        name: "Pengadaan Tanah Sorong (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-0311",
            name: "Pemberian ganti kerugian pengadaan tanah pengembangan pelabuhan sorong tahap III",
            status: "WIP",
            progress: 60,
            pic: "Andi Wijaya",
            startDate: "2026-04-01",
            dueDate: "2026-07-15",
            notes: "Pembayaran sebagian warga tersisa terus dikomunikasikan."
          },
          {
            id: "SUB-0312",
            name: "Pembongkaran bangunan yang telah diberikan ganti kerugian",
            status: "WIP",
            progress: 30,
            pic: "Andi Wijaya",
            startDate: "2026-05-01",
            dueDate: "2026-08-10",
            notes: "Bangunan yang beres dibayar mulai dinomori untuk diratakan."
          },
          {
            id: "SUB-0313",
            name: "Penyelesaian objek pengadaan tanah BMN",
            status: "WIP",
            progress: 20,
            pic: "Ahmad Sujatmiko",
            startDate: "2026-05-15",
            dueDate: "2026-09-01",
            notes: "Klarifikasi status BMN dengan KPKNL Sorong sedang dikoordinasikan."
          },
          {
            id: "SUB-0314",
            name: "Sertipikasi lahan hasil reklamasi",
            status: "WIP",
            progress: 10,
            pic: "Budi Santoso",
            startDate: "2026-06-01",
            dueDate: "2026-12-15",
            notes: "Pengumpulan berkas fisik peta bidang hasil reklamasi pelabuhan."
          }
        ]
      },
      {
        id: "TSK-032",
        name: "Pengadaan Tanah Batang (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-0321",
            name: "Pemberian ganti kerugian",
            status: "DONE",
            progress: 100,
            pic: "Andi Wijaya",
            startDate: "2026-01-15",
            dueDate: "2026-03-12",
            notes: "Penyelesaian UGR lahan Batang clear 100%."
          },
          {
            id: "SUB-0322",
            name: "Balik Nama dan Pelepasan HPL PTPN I",
            status: "DONE",
            progress: 100,
            pic: "Andi Wijaya",
            startDate: "2026-03-01",
            dueDate: "2026-04-20",
            notes: "BA Pelepasan Hak dari PTPN I selaku BUMN telah diterbitkan."
          },
          {
            id: "SUB-0323",
            name: "Pemecahan bidang tanah HPL PTPN",
            status: "WIP",
            progress: 60,
            pic: "Budi Santoso",
            startDate: "2026-05-01",
            dueDate: "2026-07-25",
            notes: "Kantah Batang sedang memproses peta bidang pecahan."
          },
          {
            id: "SUB-0324",
            name: "Penunjukan Notaris/ PPAT Pengurusan Pensertipikatan",
            status: "WIP",
            progress: 40,
            pic: "Budi Santoso",
            startDate: "2026-05-15",
            dueDate: "2026-08-10",
            notes: "Seleksi admin calon Notaris/PPAT mitra regional sedang berjalan."
          }
        ]
      },
      {
        id: "TSK-033",
        name: "Pengadaan Tanah Kuala Tanjung (RKM)",
        type: "RKM",
        subTasks: [
          {
            id: "SUB-0331",
            name: "PPK: Penyelesaian Outstanding Tahap Pelaksanaan Pengadaan Tanah",
            status: "WIP",
            progress: 50,
            pic: "Faisal Rahman",
            startDate: "2026-04-01",
            dueDate: "2026-08-15",
            notes: "Pembahasan sengketa tumpang tindih kepemilikan di level PPK."
          },
          {
            id: "SUB-0332",
            name: "PPK: Pengurusan KKPR dan Pensertipikatan",
            status: "WIP",
            progress: 30,
            pic: "Faisal Rahman",
            startDate: "2026-05-15",
            dueDate: "2026-10-30",
            notes: "Pengajuan ijin KKPR melalui sistem OSS masih diverifikasi tata ruang daerah."
          },
          {
            id: "SUB-0333",
            name: "PMT: Penyelesaian Outstanding Tahap Pelaksanaan Pengadaan Tanah",
            status: "WIP",
            progress: 40,
            pic: "Faisal Rahman",
            startDate: "2026-04-10",
            dueDate: "2026-08-20",
            notes: "Rekonsiliasi berkas nominatif PMT bersama Satgas BPN."
          },
          {
            id: "SUB-0334",
            name: "PMT: Pengurusan KKPR dan Pensertipikatan",
            status: "WIP",
            progress: 20,
            pic: "Faisal Rahman",
            startDate: "2026-05-20",
            dueDate: "2026-11-15",
            notes: "Pendaftaran awal di SIPR (Sistem Informasi Penataan Ruang)."
          }
        ]
      },
      {
        id: "TSK-034",
        name: "Pengadaan Tanah Akses Jalan MNP (Non RKM)",
        type: "NON_RKM",
        subTasks: [
          {
            id: "SUB-0341",
            name: "Penyampaian mekanisme pemberian ganti kerugian a.n. Ahli Waris Ahmad Dg. Mangawing",
            status: "DONE",
            progress: 100,
            pic: "Faisal Rahman",
            startDate: "2026-01-10",
            dueDate: "2026-02-15",
            notes: "Mekanisme legalitas disepakati bersama ahli waris dan forkopimda."
          },
          {
            id: "SUB-0342",
            name: "Pembayaran ganti kerugian a.n. Ahli Waris Ahmad Dg. Mangawing Tahap I",
            status: "WIP",
            progress: 75,
            pic: "Faisal Rahman",
            startDate: "2026-03-01",
            dueDate: "2026-07-10",
            notes: "Penyaluran dana tahap I mencapai 75% selesai diverifikasi PN Makassar."
          },
          {
            id: "SUB-0343",
            name: "Pengajuan anggaran investasi pengadaan tanah oleh Reg 4",
            status: "WIP",
            progress: 50,
            pic: "Andi Wijaya",
            startDate: "2026-04-15",
            dueDate: "2026-08-05",
            notes: "Pengajuan tambahan pagu investasi sedang dievaluasi Direksi Keuangan."
          },
          {
            id: "SUB-0344",
            name: "Pembayaran ganti kerugian a.n. Ahli Waris Ahmad Dg. Mangawing Tahap II",
            status: "WIP",
            progress: 10,
            pic: "Faisal Rahman",
            startDate: "2026-05-20",
            dueDate: "2026-09-30",
            notes: "Sedang mempersiapkan administrasi serahan tahap I untuk mencairkan tahap II."
          }
        ]
      }
    ]
  }
];

export const INITIAL_PICS = [
  "Ahmad Sujatmiko",
  "Dewi Lestari",
  "Budi Santoso",
  "Rahmat Hidayat",
  "Siti Rahmawati",
  "Andi Wijaya",
  "Faisal Rahman"
];
