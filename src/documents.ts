import { Attachment } from './types';

/* =====================================================================
 * Helper dokumen & link OneDrive (tahap 1: link share disimpan di database)
 * ===================================================================== */

export const DOCUMENT_CATEGORIES = [
  'Berita Acara',
  'Surat / Korespondensi',
  'Kontrak / PKS / Perjanjian',
  'Sertipikat / Alas Hak',
  'Peta / Lokasi',
  'Penilaian / Appraisal',
  'Ganti Kerugian / Pembayaran',
  'Penetapan / SK / Izin',
  'Laporan',
  'Dokumen Pendukung',
];

export const DOCUMENT_STAGES = [
  'Perencanaan',
  'Persiapan',
  'Pelaksanaan',
  'Penyerahan Hasil',
  'Pensertipikatan',
];

const FORMAT_CODES = new Set(['PDF', 'DOCX', 'IMAGE', 'ZIP', 'OTHER']);
export const isFormatCode = (value?: string) => FORMAT_CODES.has(String(value || '').toUpperCase());

/** Nama penyimpanan dari URL, mis. OneDrive / SharePoint / Google Drive. */
export function linkSource(url?: string) {
  const text = String(url || '').toLowerCase();
  if (!text) return '';
  if (text.includes('sharepoint.com') || text.includes('-my.sharepoint')) return 'OneDrive / SharePoint';
  if (text.includes('1drv.ms') || text.includes('onedrive.live.com') || text.includes('onedrive')) return 'OneDrive';
  if (text.includes('drive.google.com') || text.includes('docs.google.com')) return 'Google Drive';
  return 'Link';
}

export function isValidLink(url?: string) {
  try {
    const parsed = new URL(String(url || '').trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Tebak format file dari nama / link. */
export function inferFileType(name = '', url = ''): Attachment['type'] {
  const text = `${name} ${url}`.toLowerCase();
  if (/\.pdf\b|pdf/.test(text)) return 'PDF';
  if (/\.docx?\b|word/.test(text)) return 'DOCX';
  if (/\.(png|jpe?g|gif|webp)\b/.test(text)) return 'IMAGE';
  if (/\.(zip|rar|7z)\b/.test(text)) return 'ZIP';
  return 'OTHER';
}

export const makeAttachmentId = () =>
  `DOC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function buildAttachment(input: {
  name: string;
  url: string;
  category?: string;
  documentNumber?: string;
  documentDate?: string;
  stage?: string;
  notes?: string;
  uploadedBy?: string;
}): Attachment {
  return {
    id: makeAttachmentId(),
    name: input.name.trim(),
    url: input.url.trim(),
    type: inferFileType(input.name, input.url),
    uploadedAt: today(),
    category: input.category || 'Dokumen Pendukung',
    documentNumber: input.documentNumber?.trim() || undefined,
    documentDate: input.documentDate || undefined,
    stage: input.stage || undefined,
    notes: input.notes?.trim() || undefined,
    uploadedBy: input.uploadedBy || undefined,
  };
}
