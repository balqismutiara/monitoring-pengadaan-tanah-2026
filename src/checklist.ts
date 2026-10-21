import { Program } from './types';

/* =====================================================================
 * Checklist dokumen wajib per tahapan pengadaan tanah.
 * Status disimpan per program & per dokumen (tabel MySQL `program_stage_checklist`).
 * ===================================================================== */

export type StageName =
  | 'Perencanaan'
  | 'Persiapan'
  | 'Pelaksanaan'
  | 'Penyerahan Hasil'
  | 'Pensertipikatan';

export type ChecklistStatus = 'AVAILABLE' | 'MISSING' | 'OPTIONAL';

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  AVAILABLE: 'Tersedia',
  MISSING: 'Belum Ada',
  OPTIONAL: 'Tidak Wajib',
};

export const STAGES: StageName[] = [
  'Perencanaan',
  'Persiapan',
  'Pelaksanaan',
  'Penyerahan Hasil',
  'Pensertipikatan',
];

export const DEFAULT_STAGE_DOCUMENTS: Record<StageName, string[]> = {
  Perencanaan: [
    'Dokumen perencanaan pengadaan tanah',
    'Data awal lokasi / kebutuhan lahan',
    'Peta rencana lokasi',
    'Dokumen kesesuaian tata ruang',
    'Rencana jadwal pelaksanaan',
  ],
  Persiapan: [
    'Data awal pihak yang berhak',
    'Daftar objek pengadaan tanah',
    'Penetapan lokasi',
    'Pengumuman penetapan lokasi',
    'Surat pemberitahuan kepada pihak terkait',
    'Surat undangan musyawarah',
    'Berita acara sosialisasi rencana kegiatan',
  ],
  Pelaksanaan: [
    'Daftar nominatif pihak yang berhak',
    'Peta bidang hasil pengukuran',
    'Dokumen penilaian / appraisal',
    'Berita acara musyawarah',
    'Dokumen pembayaran ganti kerugian',
    'Dokumen pelepasan hak',
    'Berita acara penyerahan hasil',
  ],
  'Penyerahan Hasil': [
    'Berita acara penyerahan hasil',
    'Daftar bidang yang telah diserahkan',
    'Dokumen serah terima aset',
    'Dokumen penyelesaian administrasi',
  ],
  Pensertipikatan: [
    'Permohonan pensertipikatan',
    'Peta bidang / surat ukur',
    'Dokumen alas hak',
    'Surat pelepasan hak',
    'Berita acara pengukuran',
    'Dokumen penerbitan sertipikat',
  ],
};

/** Tahapan yang dokumennya sudah lengkap pada kondisi eksisting (Perencanaan s.d. Penyerahan Hasil). */
export const COMPLETED_STAGES: StageName[] = [
  'Perencanaan',
  'Persiapan',
  'Pelaksanaan',
  'Penyerahan Hasil',
];

/** Data yang tersimpan per dokumen checklist. */
export interface ChecklistEntry {
  status?: ChecklistStatus;
  uploadDate?: string;
  pic?: string;
  fileName?: string;
  fileUrl?: string;
  notes?: string;
}

/** programId -> documentKey -> entry */
export type ChecklistState = Record<string, Record<string, ChecklistEntry>>;

/** Kunci stabil dokumen default, mis. "default-Persiapan-0". */
export const checklistDocKey = (stage: StageName, index: number) => `default-${stage}-${index}`;

export function buildInitialChecklist(programs: Program[]): ChecklistState {
  const state: ChecklistState = {};
  programs.forEach(program => {
    const entries: Record<string, ChecklistEntry> = {};
    COMPLETED_STAGES.forEach(stage => {
      DEFAULT_STAGE_DOCUMENTS[stage].forEach((_, index) => {
        entries[checklistDocKey(stage, index)] = {
          status: 'AVAILABLE',
          pic: program.pic || '-',
          notes: 'Dokumen eksisting (tahapan telah dilalui)',
        };
      });
    });
    state[program.id] = entries;
  });
  return state;
}

/** Lengkapi state dengan entri default untuk program baru tanpa menimpa data yang sudah ada. */
export function mergeChecklistDefaults(programs: Program[], current: ChecklistState): ChecklistState {
  const defaults = buildInitialChecklist(programs);
  const merged: ChecklistState = { ...current };
  programs.forEach(program => {
    if (!merged[program.id]) merged[program.id] = defaults[program.id];
  });
  return merged;
}
