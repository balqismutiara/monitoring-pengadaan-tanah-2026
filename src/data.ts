import { Program, SubTask, SubTaskStatus, RkmSummary } from './types';

/**
 * Sumber data:
 * 1. Dokumen "Monitoring Program Pengadaan Tanah 2026 - Tugas" (daftar Program, Task, Sub Task & status)
 * 2. Laporan Bulanan RKM 2026 – Dept. Strategi Pengelolaan Aset Terintegrasi (Capaian, Isu, Next Step)
 *
 * Status: DONE (✅ Selesai) · WIP (⏳ Proses) · NOT_STARTED (❌ Belum Mulai) · DELAYED (Tertunda)
 * Sub task tanpa tanggal di dokumen sumber memakai tanggal rencana RKM (01/01/2026 – 31/12/2026)
 * dan ditandai `estimatedSchedule: true` agar mudah dikoreksi lewat Master Data.
 */

export const PIC_KIJING = 'Yayang Gunawan';
export const PIC_NPEA = 'Novan Haditya';
export const PIC_REGIONAL = 'Alfiansyah Nur Arochman';

export const RKM_PERIOD_START = '2026-01-01';
export const RKM_PERIOD_END = '2026-12-31';

/** Ringkasan header Laporan Bulanan RKM (realisasi aktual vs target baseline). */
export const RKM_SUMMARY: RkmSummary = {
  title: 'Pengadaan Tanah untuk Mendukung Proyek Strategis PT Pelabuhan Indonesia (Persero)',
  unit: 'Dept. Strategi Pengelolaan Aset Terintegrasi',
  actual: 83,
  baseline: 82,
  status: 'On Progress',
  startDate: RKM_PERIOD_START,
  endDate: RKM_PERIOD_END,
  source: 'Laporan Bulanan RKM Tahun 2026',
};

const sub = (
  id: string,
  name: string,
  status: SubTaskStatus,
  progress: number,
  pic: string,
  startDate: string,
  dueDate: string,
  notes = '',
  estimatedSchedule = true,
): SubTask => ({
  id,
  name,
  status,
  progress: status === 'DONE' ? 100 : progress,
  pic,
  startDate,
  dueDate,
  notes,
  estimatedSchedule,
});

const K = PIC_KIJING;
const N = PIC_NPEA;
const R = PIC_REGIONAL;
const END = RKM_PERIOD_END;

export const INITIAL_PROGRAMS: Program[] = [
  // =====================================================================
  // 1. PENGADAAN TANAH TERMINAL KIJING
  // =====================================================================
  {
    id: 'PRG-01',
    code: 'IS-18-KMSL-01-01',
    name: 'Pengadaan Tanah Terminal Kijing',
    pic: K,
    startDate: RKM_PERIOD_START,
    endDate: RKM_PERIOD_END,
    rkm: { actual: 33, baseline: 33, status: 'On Progress' },
    capaian: [
      {
        title: 'Pemindahan Makam Tionghoa',
        detail:
          'Telah selesai pengambilan dan pemindahan makam sebanyak 170 makam dengan capaian 100% sesuai surat keterangan pemindahan dari YPKOT.',
      },
      {
        title: 'Relokasi Aset Pemerintah Desa Sungai Duri II dan Sungai Limau',
        detail:
          'Telah disampaikan laporan progres pekerjaan dan pemutusan kontrak pekerjaan relokasi aset; saat ini dalam proses penunjukan vendor pengganti.',
      },
      {
        title: 'Pensertipikatan HGB di atas HPL Konsesi',
        detail:
          'Telah dilakukan pembayaran PNBP pengukuran bidang tanah yang akan dimohonkan HGB Konsesi Terminal Kijing.',
      },
      {
        title: 'Pendaftaran Pensertipikatan RJN',
        detail:
          'Telah dilakukan penyerahan hasil pengadaan tanah RJN dengan prestasi fisik 100%.',
      },
    ],
    isu: [
      {
        title: 'Kelengkapan Dokumen Pertanahan',
        detail:
          'Dokumen pensertipikatan HGB Konsesi dan RJN masih dalam proses pemenuhan dan verifikasi serta penunjukan Notaris/PPAT.',
      },
      {
        title: 'Penyelesaian Relokasi Aset',
        detail:
          'Relokasi dan pengosongan lahan masih memerlukan koordinasi dengan stakeholder dan penunjukan kembali vendor baru.',
      },
    ],
    nextStep: [
      {
        title: 'Sertipikasi Ex. Lahan Makam Tionghoa',
        detail: 'Penyiapan dokumen terkait hasil pengadaan tanah.',
      },
      {
        title: 'Relokasi Aset Pemerintah Desa Sungai Duri II dan Sungai Limau',
        detail: 'Monitoring dan evaluasi proses pekerjaan (vendor pengganti).',
      },
      {
        title: 'Pensertipikatan HGB di atas HPL Konsesi',
        detail:
          'Penetapan Notaris/PPAT untuk proses pensertipikatan HGB Konsesi Terminal Kijing dan melengkapi kekurangan dokumen.',
      },
      {
        title: 'Pendaftaran Pensertipikatan RJN',
        detail:
          'Inventarisasi kelengkapan dokumen persyaratan permohonan pensertipikatan hasil pengadaan tanah RJN.',
      },
    ],
    tasks: [
      {
        id: 'TSK-01A',
        name: 'Konsinyasi dan Pengosongan Makam Tionghoa (RKM)',
        type: 'RKM',
        stage: 'C. Pelaksanaan',
        taskCode: 'C.5',
        description: 'Pemberian ganti kerugian melalui konsinyasi dan pengosongan lahan makam Tionghoa.',
        subTasks: [
          sub('SUB-01A1', 'Pengambilan UGR Ahli Waris di PN Mempawah', 'DONE', 100, K, '2026-01-15', '2026-03-15', 'UGR telah diambil ahli waris di PN Mempawah.'),
          sub('SUB-01A2', 'Permohonan Pendampingan oleh Kejati Kalbar', 'DONE', 100, K, '2026-02-01', '2026-04-10', 'Pendampingan Kejati Kalbar telah diperoleh.'),
          sub('SUB-01A3', 'Pemindahan Makam oleh Ahli Waris', 'DONE', 100, K, '2026-04-15', '2026-07-20', '170 makam telah dipindahkan (100%) sesuai surat keterangan pemindahan YPKOT.'),
          sub('SUB-01A4', 'Land Clearing Lahan', 'DONE', 100, K, '2026-05-01', '2026-08-15', 'Land clearing lahan ex. makam telah selesai.'),
        ],
      },
      {
        id: 'TSK-01B',
        name: 'Relokasi Aset Pemerintah Desa (RKM)',
        type: 'RKM',
        stage: 'C. Pelaksanaan',
        taskCode: 'C.6',
        description: 'Relokasi aset Pemerintah Desa Sungai Duri II dan Sungai Limau, Kijing.',
        subTasks: [
          sub('SUB-01B1', 'Kontrak Pekerjaan Pembangunan Aset Desa', 'WIP', 50, K, '2026-02-10', END, 'Kontrak awal telah diputus; proses penunjukan kontraktor/vendor pengganti sedang berjalan.'),
          sub('SUB-01B2', 'Pelaksanaan Pekerjaan Pembangunan Aset Desa', 'WIP', 50, K, '2026-04-05', END, 'Progres fisik 50%; dilanjutkan oleh vendor pengganti.'),
          sub('SUB-01B3', 'Serah Terima Aset Desa', 'NOT_STARTED', 0, K, '2026-11-15', END, 'Menunggu penyelesaian pekerjaan pembangunan aset desa.'),
        ],
      },
      {
        id: 'TSK-01C',
        name: 'Pendaftaran Pensertipikatan RJN (RKM)',
        type: 'RKM',
        stage: 'D. Penyerahan Hasil',
        taskCode: 'D.1',
        description: 'Penyerahan hasil pengadaan tanah RJN, tukar menukar dengan Kementerian PU dan pensertipikatan.',
        subTasks: [
          sub('SUB-01C1', 'Penyerahan Hasil Pengadaan Tanah RJN', 'DONE', 100, K, '2026-03-01', '2026-05-10', 'Penyerahan hasil pengadaan tanah RJN telah dilakukan (prestasi fisik 100%).'),
          sub('SUB-01C2', 'Monitoring Pelaksanaan Pekerjaan Pembangunan RJN', 'WIP', 90, K, '2026-05-15', END, 'Progres pembangunan RJN 90%.'),
          sub('SUB-01C3', 'Penunjukan KJPP Barang Pengganti', 'WIP', 70, K, '2026-09-16', '2026-10-22', 'Task baru. Penunjukan KJPP 70%.', false),
          sub('SUB-01C4', 'Pelaksanaan Penilaian dan Laporan Hasil Penilaian Barang Pengganti', 'NOT_STARTED', 0, K, '2026-10-27', '2026-11-27', 'Dimulai setelah KJPP ditunjuk.', false),
          sub('SUB-01C5', 'Serah Terima Tukar Menukar antara Pelindo dan Kementerian PU', 'NOT_STARTED', 0, K, '2026-11-28', END, 'Menunggu laporan hasil penilaian barang pengganti.'),
          sub('SUB-01C6', 'Penunjukan Notaris Sertifikasi Tanah RJN', 'NOT_STARTED', 0, K, '2026-11-28', END, 'Inventarisasi kelengkapan dokumen persyaratan permohonan sertipikat RJN.'),
        ],
      },
      {
        id: 'TSK-01D',
        name: 'Pensertipikatan HGB di atas HPL Konsesi (RKM)',
        type: 'RKM',
        stage: 'D. Penyerahan Hasil',
        taskCode: 'D.2',
        description: 'Pensertipikatan HGB di atas HPL Konsesi Terminal Kijing.',
        subTasks: [
          sub('SUB-01D1', 'Permohonan Pengukuran Bidang Tanah', 'DONE', 100, K, '2026-01-10', '2026-02-20', 'Permohonan pengukuran telah diajukan ke BPN.'),
          sub('SUB-01D2', 'Pembayaran PNBP Pengukuran dan Pemetaan Bidang Tanah', 'DONE', 100, K, '2026-02-25', '2026-03-05', 'PNBP pengukuran bidang tanah telah dibayar.'),
          sub('SUB-01D3', 'Penunjukan Notaris/ PPAT Pengurusan Pensertipikatan', 'WIP', 10, K, '2026-10-15', END, 'Proses penetapan Notaris/PPAT dan melengkapi kekurangan dokumen.', false),
          sub('SUB-01D4', 'Pembayaran PNBP terkait Pensertipikatan', 'NOT_STARTED', 0, K, '2026-11-01', END, 'Menunggu penunjukan Notaris/PPAT.'),
          sub('SUB-01D5', 'BPHTB HGB Konsesi', 'NOT_STARTED', 0, K, '2026-11-15', END, 'Menunggu penunjukan Notaris/PPAT.'),
          sub('SUB-01D6', 'Penerbitan SK HGB Konsesi', 'NOT_STARTED', 0, K, '2026-12-01', END, 'Bergantung pada pembayaran PNBP dan BPHTB.'),
          sub('SUB-01D7', 'Penerbitan Sertipikat HGB Konsesi', 'NOT_STARTED', 0, K, '2026-12-10', END, 'Bergantung pada penerbitan SK HGB Konsesi.'),
        ],
      },
      {
        id: 'TSK-01E',
        name: 'Pensertipikatan Makam Tionghoa dan RJN Eksisting',
        type: 'RKM',
        stage: 'D. Penyerahan Hasil',
        taskCode: 'D.3',
        description: 'Task baru. Sertipikasi ex. lahan makam Tionghoa dan RJN eksisting.',
        subTasks: [
          sub('SUB-01E1', 'Penyiapan Dokumen Hasil Pengadaan Tanah (Ex. Lahan Makam Tionghoa & RJN Eksisting)', 'NOT_STARTED', 0, K, '2026-11-01', END, 'Next step RKM: penyiapan dokumen terkait hasil pengadaan tanah. Rincian sub task belum ditetapkan.'),
        ],
      },
    ],
  },

  // =====================================================================
  // 2. PENGADAAN TANAH NPEA
  // =====================================================================
  {
    id: 'PRG-02',
    code: 'IS-18-KMSL-01-02',
    name: 'Pengadaan Tanah NPEA',
    pic: N,
    startDate: RKM_PERIOD_START,
    endDate: RKM_PERIOD_END,
    rkm: { actual: 35, baseline: 34, status: 'On Progress' },
    capaian: [
      {
        title: 'Relokasi Aset TNI AL',
        detail:
          'Telah dilakukan kontrak dengan Notaris/PPAT untuk pembayaran dan sertipikasi tanah pengganti BMN TNI AL serta pendampingan Kejagung dalam proses tukar menukar BMN TNI AL.',
      },
      {
        title: 'Relokasi Aset PT KBN',
        detail:
          'Telah dilakukan Serah Sedia Lahan untuk pembangunan jalan pengganti dan proses pekerjaan bangunan pengganti.',
      },
      {
        title: 'Pendaftaran Pensertipikatan Hasil Pengadaan Tanah NPEA',
        detail:
          'Telah dilakukan penyerahan hasil pengadaan tanah (parsial) dan dalam proses permohonan pemecahan bidang tanah.',
      },
      {
        title: 'Konsinyasi dan Eksekusi Pengosongan Tanah',
        detail:
          'Dari 27 danom yang dikonsinyasi, telah keluar 24 penetapan PN Jakarta Utara dan 3 danom dalam proses sidang penetapan.',
      },
    ],
    isu: [
      {
        title: 'Relokasi Aset & Penyelesaian Lahan',
        detail:
          'Relokasi TNI AL/KBN dan pengosongan tanah masih bergantung pada koordinasi stakeholder serta penyelesaian aset pengganti.',
      },
      {
        title: 'Pensertipikatan Tanah NPEA',
        detail:
          'Proses pemecahan bidang dan sertipikasi masih memerlukan kelengkapan dokumen serta koordinasi dengan BPN.',
      },
    ],
    nextStep: [
      {
        title: 'Relokasi Aset TNI AL',
        detail: 'Koordinasi intensif dengan stakeholder terkait (TNI AL, Kemhan, Kemenkeu, BPN dan Kejagung).',
      },
      {
        title: 'Relokasi Aset PT KBN',
        detail: 'Monitoring dan evaluasi proses pembangunan bangunan pengganti.',
      },
      {
        title: 'Pendaftaran Pensertipikatan Hasil Pengadaan Tanah NPEA',
        detail: 'Percepatan pemecahan bidang tanah dan penyiapan kelengkapan dokumen permohonan sertipikasi.',
      },
      {
        title: 'Konsinyasi dan Eksekusi Pengosongan Tanah',
        detail: 'Monitoring dan koordinasi progres atas sisa 3 danom yang belum keluar penetapan pengadilan.',
      },
    ],
    tasks: [
      {
        id: 'TSK-02A',
        name: 'Relokasi Aset TNI AL/ Tukar Menukar BMN TNI AL (RKM)',
        type: 'RKM',
        stage: 'C. Pelaksanaan',
        taskCode: 'C.6',
        description: 'Relokasi aset TNI AL melalui mekanisme tukar menukar BMN.',
        subTasks: [
          sub('SUB-02A1', 'BA Kesepakatan Lokasi Tanah dan Bangunan Pengganti', 'DONE', 100, N, '2026-01-05', '2026-01-20', 'BA kesepakatan lokasi telah ditandatangani.'),
          sub('SUB-02A2', 'Perjanjian Pendahuluan Tukar Menukar/ Penyediaan Aset Pengganti', 'WIP', 10, N, '2026-09-01', END, 'Task baru. Progres 10%.'),
          sub('SUB-02A3', 'Perolehan Ijin Prinsip Tukar Menukar', 'WIP', 30, N, '2026-02-01', END, 'Koordinasi dengan TNI AL, Kemhan dan Kemenkeu.'),
          sub('SUB-02A4', 'Perolehan Ijin Pelaksanaan Tukar Menukar', 'NOT_STARTED', 0, N, '2026-11-01', END, 'Menunggu terbitnya ijin prinsip tukar menukar.'),
          sub('SUB-02A5', 'PKS Tukar Menukar', 'WIP', 25, N, '2026-04-10', END, 'Penyusunan draf PKS bersama TNI AL.'),
          sub('SUB-02A6', 'Permohonan LO dan/ atau LA dari Kejaksaan', 'WIP', 40, N, '2026-05-01', END, 'Pendampingan Kejagung dalam proses tukar menukar BMN TNI AL.'),
          sub('SUB-02A7', 'DPPT Tanah Pengganti (Tj Pinang, Pontianak, Merauke)', 'DONE', 100, N, '2026-01-05', '2026-02-15', 'DPPT tanah pengganti telah selesai.'),
          sub('SUB-02A8', 'Penilaian Tanah Pengganti', 'DONE', 100, N, '2026-02-20', '2026-03-20', 'Penilaian tanah pengganti oleh KJPP telah selesai.'),
          sub('SUB-02A9', 'Pelaksanaan Pengadaan Tanah Pengganti', 'WIP', 50, N, '2026-04-01', END, 'Kontrak Notaris/PPAT untuk pembayaran dan sertipikasi tanah pengganti BMN TNI AL telah dilakukan.'),
          sub('SUB-02A10', 'Kesepakatan Bentuk dan Design Bangunan Pengganti', 'WIP', 45, N, '2026-04-15', END, 'Pembahasan desain bangunan pengganti dengan TNI AL.'),
          sub('SUB-02A11', 'Monitoring Pekerjaan Bangunan Pengganti', 'NOT_STARTED', 0, N, '2026-11-15', END, 'Menunggu kesepakatan desain dan PKS tukar menukar.'),
          sub('SUB-02A12', 'Serah Terima Aset', 'NOT_STARTED', 0, N, '2026-12-15', END, 'Menunggu penyelesaian bangunan pengganti.'),
        ],
      },
      {
        id: 'TSK-02B',
        name: 'Relokasi Aset/ Pemberian Ganti Kerugian Bentuk Lain PT KBN (RKM) (Bidang 22 dan 27)',
        type: 'RKM',
        stage: 'C. Pelaksanaan',
        taskCode: 'C.6',
        description: 'Pemberian ganti kerugian dalam bentuk lain kepada PT KBN untuk bidang 22 dan 27.',
        subTasks: [
          sub('SUB-02B1', 'PKS Pemberian Ganti Kerugian Dalam Bentuk Lain dengan PT KBN', 'DONE', 100, N, '2026-02-15', '2026-04-10', 'PKS telah ditandatangani.'),
          sub('SUB-02B2', 'Pembayaran Uang Pengganti', 'DONE', 100, N, '2026-04-12', '2026-05-01', 'Pembayaran uang pengganti telah dilakukan.'),
          sub('SUB-02B3', 'Monitoring Pekerjaan Bangunan Pengganti', 'WIP', 40, N, '2026-05-05', END, 'Serah Sedia Lahan untuk jalan pengganti telah dilakukan; pekerjaan bangunan pengganti berjalan.'),
          sub('SUB-02B4', 'Evaluasi PKS dan Rencana Addendum', 'WIP', 30, N, '2026-08-01', END, 'Task baru.'),
          sub('SUB-02B5', 'Addendum PKS Pemberian Ganti Kerugian Dalam Bentuk Lain dengan PT KBN', 'WIP', 10, N, '2026-09-01', END, 'Task baru.'),
          sub('SUB-02B6', 'Serah Terima Aset', 'NOT_STARTED', 0, N, '2026-12-01', END, 'Task baru. Menunggu penyelesaian bangunan pengganti.'),
        ],
      },
      {
        id: 'TSK-02C',
        name: 'Pendaftaran Pensertipikatan Hasil Pengadaan Tanah NPEA (RKM)',
        type: 'RKM',
        stage: 'D. Penyerahan Hasil',
        taskCode: 'D.1',
        description: 'Penyerahan hasil dan pensertipikatan bidang tanah hasil pengadaan NPEA.',
        subTasks: [
          sub('SUB-02C1', 'Penyerahan Hasil Pengadaan Tanah (parsial)', 'DONE', 100, N, '2026-02-01', '2026-04-15', 'Penyerahan hasil pengadaan tanah parsial telah dilakukan.'),
          sub('SUB-02C2', 'Pemecahan Bidang Tanah', 'WIP', 30, N, '2026-04-20', END, 'Permohonan pemecahan bidang tanah sedang diproses BPN.'),
          sub('SUB-02C3', 'Penunjukan Notaris/ PPAT Pengurusan Pensertipikatan', 'NOT_STARTED', 0, N, '2026-11-01', END, 'Menunggu penyelesaian pemecahan bidang.'),
        ],
      },
      {
        id: 'TSK-02D',
        name: 'Konsinyasi dan Pengosongan Lahan (RKM)',
        type: 'RKM',
        stage: 'C. Pelaksanaan',
        taskCode: 'C.5',
        description: 'Konsinyasi UGR di PN Jakarta Utara dan eksekusi pengosongan lahan.',
        subTasks: [
          sub('SUB-02D1', 'Pendaftaran dan Pembayaran UGR Konsinyasi ke PN Jakut', 'DONE', 100, N, '2026-02-20', '2026-04-25', 'UGR konsinyasi telah dititipkan di PN Jakarta Utara.'),
          sub('SUB-02D2', 'Penetapan Pengadilan terkait Konsinyasi', 'WIP', 98, N, '2026-05-01', END, '24 dari 27 danom telah keluar penetapan PN Jakarta Utara; 3 danom dalam proses sidang.'),
          sub('SUB-02D3', 'Monitoring Pengambilan UGR Konsinyasi oleh PYB di Pengadilan Jakut', 'WIP', 20, N, '2026-05-10', END, 'Pengambilan UGR oleh Pihak Yang Berhak masih berjalan.'),
          sub('SUB-02D4', 'Pengosongan Lahan', 'NOT_STARTED', 0, N, '2026-11-15', END, 'Menunggu seluruh penetapan konsinyasi.'),
        ],
      },
      {
        id: 'TSK-02E',
        name: 'Perpanjangan Penlok NPEA (Non RKM)',
        type: 'NON_RKM',
        stage: 'B. Persiapan',
        taskCode: 'B.4',
        description: 'Perpanjangan Penetapan Lokasi (Penlok) NPEA.',
        subTasks: [
          sub('SUB-02E1', 'Permohonan Rekomendasi Perpanjangan Penlok ke Kanwil BPN DKI Jakarta', 'DONE', 100, N, '2026-01-10', '2026-02-28', 'Permohonan telah disampaikan.'),
          sub('SUB-02E2', 'Rekomendasi Perpanjangan Penlok dari Kanwil BPN DKI Jakarta', 'DONE', 100, N, '2026-03-01', '2026-04-15', 'Rekomendasi telah terbit.'),
          sub('SUB-02E3', 'Permohonan Perpanjangan Penlok ke Gubernur DKI Jakarta', 'DONE', 100, N, '2026-04-16', '2026-05-15', 'Permohonan telah disampaikan.'),
          sub('SUB-02E4', 'SK Perpanjangan Penlok dari Gubernur DKI Jakarta', 'DONE', 100, N, '2026-05-16', '2026-06-30', 'SK perpanjangan penlok telah terbit.'),
        ],
      },
    ],
  },

  // =====================================================================
  // 3. MONITORING DAN ASISTENSI TAHAPAN PENGADAAN TANAH REGIONAL/CABANG
  // =====================================================================
  {
    id: 'PRG-03',
    code: 'IS-18-KMSL-01-03',
    name: 'Monitoring dan Asistensi Tahapan Pengadaan Tanah Regional/Cabang',
    pic: R,
    startDate: RKM_PERIOD_START,
    endDate: RKM_PERIOD_END,
    rkm: { actual: 15, baseline: 15, status: 'On Progress' },
    capaian: [
      {
        title: 'Sorong',
        detail: 'Telah dilakukan pembahasan monitoring progres pengadaan tanah Sorong dengan Regional 4 dan Cabang Sorong.',
      },
      {
        title: 'Batang',
        detail: 'Telah dilakukan pembahasan persiapan penunjukan Notaris terkait proses pensertipikatan HPL.',
      },
      {
        title: 'Kuala Tanjung',
        detail: 'Telah dilakukan pembahasan monitoring progres pengadaan tanah Kuala Tanjung dengan Regional 1.',
      },
    ],
    isu: [
      {
        title: 'Pensertipikatan Lahan',
        detail:
          'Proses sertipikasi lahan Sorong dan HPL Batang masih memerlukan koordinasi dengan BPN serta penyelesaian administrasi terkait.',
      },
      {
        title: 'Pengadaan Tanah Kuala Tanjung',
        detail: 'Penyelesaian pengadaan tanah masih menunggu tindak lanjut proses di Kementerian ATR/BPN.',
      },
    ],
    nextStep: [
      {
        title: 'Sorong',
        detail:
          'Monitoring dan koordinasi tindak lanjut dengan Regional 4 dan Cabang Sorong terkait pensertipikatan lahan reklamasi 5 Ha. SKK sudah diberikan kepada ED Regional 4.',
      },
      {
        title: 'Batang',
        detail: 'Monitoring dan evaluasi hasil pekerjaan Notaris.',
      },
      {
        title: 'Kuala Tanjung',
        detail:
          'Monitoring dan asistensi bersama Regional 1 dan PPK; surat ke direksi PPK untuk percepatan dengan Kanwil BPN setempat dan tindak lanjut tim kantor pusat ke Kementerian ATR/BPN.',
      },
    ],
    tasks: [
      {
        id: 'TSK-03A',
        name: 'Pengadaan Tanah Sorong (RKM)',
        type: 'RKM',
        stage: 'C. Pelaksanaan',
        taskCode: 'C.5',
        description: 'Monitoring pengadaan tanah pengembangan Pelabuhan Sorong bersama Regional 4.',
        subTasks: [
          sub('SUB-03A1', 'Pemberian Ganti Kerugian Pengadaan Tanah Pengembangan Pelabuhan Sorong Tahap III', 'WIP', 60, R, '2026-04-01', END, 'Koordinasi dengan Regional 4 dan Cabang Sorong.'),
          sub('SUB-03A2', 'Pembongkaran Bangunan yang Telah Diberikan Ganti Kerugian', 'WIP', 30, R, '2026-05-01', END, ''),
          sub('SUB-03A3', 'Penyelesaian Objek Pengadaan Tanah BMN', 'WIP', 20, R, '2026-05-15', END, ''),
          sub('SUB-03A4', 'Sertipikasi Lahan Hasil Reklamasi', 'WIP', 10, R, '2026-06-01', END, 'Pensertipikatan lahan reklamasi 5 Ha; SKK telah diberikan kepada ED Regional 4.'),
        ],
      },
      {
        id: 'TSK-03B',
        name: 'Pengadaan Tanah Batang (RKM)',
        type: 'RKM',
        stage: 'D. Penyerahan Hasil',
        taskCode: 'D.1',
        description: 'Monitoring pengadaan tanah dan pensertipikatan HPL Batang.',
        subTasks: [
          sub('SUB-03B1', 'Pemberian Ganti Kerugian', 'DONE', 100, R, '2026-01-15', '2026-03-12', 'Ganti kerugian telah diselesaikan.'),
          sub('SUB-03B2', 'Balik Nama dan Pelepasan HPL PTPN I', 'DONE', 100, R, '2026-03-01', '2026-04-20', 'Pelepasan HPL PTPN I telah selesai.'),
          sub('SUB-03B3', 'Pemecahan Bidang Tanah HPL PTPN', 'WIP', 60, R, '2026-05-01', END, 'Progres pemecahan bidang 60%.'),
          sub('SUB-03B4', 'Penunjukan Notaris/ PPAT Pengurusan Pensertipikatan', 'DONE', 100, R, '2026-05-15', '2026-08-10', 'Notaris/PPAT telah ditunjuk; monitoring dan evaluasi hasil pekerjaan Notaris.'),
          sub('SUB-03B5', 'Penentuan HPL (Kementerian Perhubungan/ Pelindo)', 'WIP', 30, R, '2026-08-01', END, 'Task baru. Dalam proses.'),
        ],
      },
      {
        id: 'TSK-03C',
        name: 'Pengadaan Tanah Kuala Tanjung (RKM)',
        type: 'RKM',
        stage: 'C. Pelaksanaan',
        taskCode: 'C.7',
        description: 'Monitoring dan asistensi pengadaan tanah Kuala Tanjung bersama Regional 1 dan PPK.',
        subTasks: [
          sub('SUB-03C1', 'PPK: Penyelesaian Outstanding Tahap Pelaksanaan Pengadaan Tanah', 'WIP', 50, R, '2026-04-01', END, 'Menunggu tindak lanjut di Kementerian ATR/BPN.'),
          sub('SUB-03C2', 'PPK: Pengurusan KKPR dan Pensertipikatan', 'WIP', 30, R, '2026-05-15', END, 'Surat ke direksi PPK untuk percepatan dengan Kanwil BPN setempat.'),
          sub('SUB-03C3', 'PMT: Penyelesaian Outstanding Tahap Pelaksanaan Pengadaan Tanah', 'WIP', 40, R, '2026-04-10', END, ''),
          sub('SUB-03C4', 'PMT: Pengurusan KKPR dan Pensertipikatan', 'WIP', 20, R, '2026-05-20', END, ''),
        ],
      },
      {
        id: 'TSK-03D',
        name: 'Pengadaan Tanah Akses Jalan MNP (Non RKM)',
        type: 'NON_RKM',
        stage: 'C. Pelaksanaan',
        taskCode: 'C.5',
        description: 'Pengadaan tanah akses jalan Makassar New Port (Regional 4).',
        subTasks: [
          sub('SUB-03D1', 'Penyampaian Mekanisme Pemberian Ganti Kerugian a.n. Ahli Waris Ahmad Dg. Mangawing', 'DONE', 100, R, '2026-01-10', '2026-02-15', 'Mekanisme pemberian ganti kerugian telah disampaikan.'),
          sub('SUB-03D2', 'Pembayaran Ganti Kerugian a.n. Ahli Waris Ahmad Dg. Mangawing Tahap I', 'WIP', 75, R, '2026-03-01', END, ''),
          sub('SUB-03D3', 'Pengajuan Anggaran Investasi Pengadaan Tanah oleh Reg 4', 'WIP', 50, R, '2026-04-15', END, ''),
          sub('SUB-03D4', 'Pembayaran Ganti Kerugian a.n. Ahli Waris Ahmad Dg. Mangawing Tahap II', 'WIP', 10, R, '2026-05-20', END, ''),
        ],
      },
    ],
  },
];
