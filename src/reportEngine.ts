import { NarrativeItem, Program, RkmSummary, SubTaskStatus } from './types';
import {
  calculateSubTaskProgress,
  daysBetween,
  plannedProgressAt,
  STATUS_LABELS,
} from './utils';

/* =====================================================================
 * Mesin laporan: dipakai halaman Laporan & Analitik dan Export Laporan
 * ===================================================================== */

export type PriorityLevel = 'Tinggi' | 'Sedang' | 'Rendah';
export type ProgramCondition = 'Sesuai Target' | 'Perlu Perhatian' | 'Kritis';

export interface ReportItem {
  id: string;
  programId: string;
  programName: string;
  taskName: string;
  subTaskName: string;
  pic: string;
  status: SubTaskStatus;
  statusLabel: string;
  progress: number;
  startDate: string;
  dueDate: string;
  plannedProgress: number;
  deviation: number;
  overdueDays: number;
  daysLeft: number;
  notes: string;
  waitingFor: string;
  category: string;
  priority: PriorityLevel;
  strategicStep: string;
  estimatedSchedule: boolean;
}

export interface StrategicAction {
  programName: string;
  issue: string;
  impact: string;
  step: string;
  pic: string;
  target: string;
  priority: PriorityLevel;
}

export interface TaskSummary {
  name: string;
  type: string;
  progress: number;
  done: number;
  total: number;
  statusLabel: string;
}

export interface ProgramReport {
  id: string;
  code: string;
  name: string;
  pic: string;
  startDate: string;
  endDate: string;
  rkmActual: number | null;
  rkmBaseline: number | null;
  rkmStatus: string;
  systemProgress: number;
  plannedProgress: number;
  deviation: number;
  counts: Record<SubTaskStatus, number> & { total: number };
  achievementRate: number;
  healthScore: number;
  condition: ProgramCondition;
  tasks: TaskSummary[];
  capaian: NarrativeItem[];
  isu: NarrativeItem[];
  systemIssues: NarrativeItem[];
  nextStep: NarrativeItem[];
  achieved: ReportItem[];
  pending: ReportItem[];
  actions: StrategicAction[];
}

export interface OverallReport {
  asOf: string;
  periodStart: string;
  periodEnd: string;
  rkm: RkmSummary | null;
  rkmActual: number | null;
  rkmBaseline: number | null;
  systemProgress: number;
  plannedProgress: number;
  deviation: number;
  totals: { programs: number; tasks: number; subTasks: number };
  counts: Record<SubTaskStatus, number> & { total: number };
  achievementRate: number;
  overdueCount: number;
  dueSoonCount: number;
  daysToYearEnd: number;
  programs: ProgramReport[];
  actions: StrategicAction[];
  executiveSummary: string[];
  keyFindings: string[];
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export const formatDateId = (value?: string, month: 'long' | 'short' = 'short') => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month, year: 'numeric' }).format(date);
};

/* ---------------------------------------------------------------------
 * Klasifikasi isu & langkah strategis berbasis kata kunci sub task
 * ------------------------------------------------------------------- */
const RULES: Array<{ test: RegExp; category: string; step: string; impact: string }> = [
  {
    test: /notaris|ppat|kjpp|penilai/i,
    category: 'Pengadaan Jasa (Notaris/PPAT/KJPP)',
    step: 'Percepat penetapan penyedia jasa (Notaris/PPAT/KJPP): finalisasi dokumen pengadaan, tetapkan tanggal kontrak dan kick-off, lalu pantau output mingguan.',
    impact: 'Tahapan sertipikasi/penilaian berikutnya belum dapat dimulai.',
  },
  {
    test: /konsinyasi|pengadilan|pn jakut|ugr|pengosongan/i,
    category: 'Konsinyasi & Pengosongan',
    step: 'Koordinasi intensif dengan PN dan JPN/Kejaksaan untuk percepatan penetapan dan pengambilan UGR; siapkan rencana pengosongan bersama aparat setempat.',
    impact: 'Lahan belum clean & clear sehingga belum dapat dimanfaatkan.',
  },
  {
    test: /tukar menukar|tni al|ijin|izin|kejaksaan|lo dan|pks|addendum|perjanjian|kementerian|hpl \(|penentuan hpl/i,
    category: 'Koordinasi Stakeholder & Legal',
    step: 'Eskalasi melalui rapat koordinasi tingkat pimpinan dengan stakeholder terkait (TNI AL, Kemhan, Kemenkeu, Kejagung, Kemenhub/PU); sepakati timeline bersama dan tuangkan dalam notulen.',
    impact: 'Proses relokasi/tukar menukar aset tertahan pada persetujuan pihak eksternal.',
  },
  {
    test: /sertip|pemecahan|hgb|hpl|kkpr|pnbp|bphtb|bpn|penyerahan hasil|pensertipikatan|dokumen/i,
    category: 'Pertanahan & Sertipikasi (BPN)',
    step: 'Jadwalkan rapat koordinasi berkala dengan Kantah/Kanwil BPN, susun checklist kelengkapan berkas, dan tunjuk pengawal berkas hingga terbit sertipikat.',
    impact: 'Hak atas tanah hasil pengadaan belum memiliki kepastian hukum (sertipikat).',
  },
  {
    test: /pembangunan|bangunan|konstruksi|kontrak pekerjaan|land clearing|pembongkaran/i,
    category: 'Pekerjaan Fisik & Vendor',
    step: 'Monitoring progres fisik mingguan terhadap vendor, tetapkan kurva-S dan milestone, serta siapkan mitigasi bila terjadi keterlambatan/wanprestasi.',
    impact: 'Serah terima aset pengganti dan pengosongan lahan ikut tertunda.',
  },
  {
    test: /pembayaran|anggaran|ganti kerugian|uang pengganti/i,
    category: 'Pembayaran & Anggaran',
    step: 'Pastikan ketersediaan anggaran dan kelengkapan dokumen pencairan; koordinasi dengan fungsi Keuangan dan Regional terkait.',
    impact: 'Hak pihak yang berhak belum terselesaikan sehingga lahan belum dapat dikuasai.',
  },
  {
    test: /serah terima/i,
    category: 'Serah Terima Aset',
    step: 'Siapkan BA serah terima dan checklist aset sejak dini; jadwalkan segera setelah pekerjaan pendahulu selesai.',
    impact: 'Penutupan program tertunda.',
  },
];

const classify = (text: string) =>
  RULES.find(rule => rule.test.test(text)) || {
    category: 'Monitoring Umum',
    step: 'Lakukan monitoring berkala dan pembaruan progres mingguan oleh PIC.',
    impact: 'Potensi deviasi terhadap target RKM.',
  };

const priorityOf = (item: Pick<ReportItem, 'status' | 'overdueDays' | 'deviation' | 'daysLeft' | 'progress'>): PriorityLevel => {
  if (item.status === 'DONE') return 'Rendah';
  if (item.overdueDays > 0 || item.status === 'DELAYED') return 'Tinggi';
  if (item.daysLeft <= 14) return 'Tinggi';
  if (item.daysLeft <= 30 && item.progress < 80) return 'Tinggi';
  if (item.deviation <= -40) return 'Tinggi';
  if (item.deviation <= -15 || item.daysLeft <= 60) return 'Sedang';
  return 'Rendah';
};

export const PRIORITY_RANK: Record<PriorityLevel, number> = { Tinggi: 0, Sedang: 1, Rendah: 2 };

/** Ambang kondisi program berdasarkan skor kesehatan. */
export const HEALTH_THRESHOLDS = { onTrack: 85, attention: 65 };

const emptyCounts = () => ({ DONE: 0, WIP: 0, NOT_STARTED: 0, DELAYED: 0, total: 0 });

/* ---------------------------------------------------------------------
 * Builder per program
 * ------------------------------------------------------------------- */
function buildProgramReport(program: Program, asOf: string): ProgramReport {
  const counts = emptyCounts();
  const items: ReportItem[] = [];
  const tasks: TaskSummary[] = [];

  program.tasks.forEach(task => {
    let taskDone = 0;
    let taskProgress = 0;

    task.subTasks.forEach((subTask, index) => {
      const status = (subTask.status || 'WIP') as SubTaskStatus;
      const progress = calculateSubTaskProgress(status, subTask.progress);
      const planned = status === 'DONE' ? 100 : plannedProgressAt(subTask.startDate, subTask.dueDate, asOf);
      const daysLeft = subTask.dueDate ? daysBetween(asOf, subTask.dueDate) : 999;
      const overdueDays = status !== 'DONE' && daysLeft < 0 ? -daysLeft : 0;

      const predecessor = task.subTasks
        .slice(0, index)
        .reverse()
        .find(previous => previous.status !== 'DONE');

      const text = `${subTask.name} ${task.name}`;
      const rule = classify(text);

      const base = {
        status,
        overdueDays,
        deviation: Math.round(progress - planned),
        daysLeft,
        progress,
      };

      items.push({
        id: subTask.id,
        programId: program.id,
        programName: program.name,
        taskName: task.name,
        subTaskName: subTask.name,
        pic: subTask.pic || program.pic || '-',
        status,
        statusLabel: STATUS_LABELS[status] || status,
        progress,
        startDate: subTask.startDate,
        dueDate: subTask.dueDate,
        plannedProgress: planned,
        deviation: base.deviation,
        overdueDays,
        daysLeft,
        notes: subTask.notes || '',
        waitingFor: status === 'NOT_STARTED' && predecessor ? predecessor.name : '',
        category: rule.category,
        priority: priorityOf(base),
        strategicStep: rule.step,
        estimatedSchedule: Boolean(subTask.estimatedSchedule),
      });

      counts[status] += 1;
      counts.total += 1;
      taskProgress += progress;
      if (status === 'DONE') taskDone += 1;
    });

    const avg = task.subTasks.length ? Math.round(taskProgress / task.subTasks.length) : 0;
    tasks.push({
      name: task.name,
      type: task.type === 'NON_RKM' ? 'Non RKM' : 'RKM',
      progress: avg,
      done: taskDone,
      total: task.subTasks.length,
      statusLabel: avg === 100 ? 'Selesai' : avg === 0 ? 'Belum Mulai' : 'Proses',
    });
  });

  const plannedProgress = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.plannedProgress, 0) / items.length)
    : 0;
  const itemProgress = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length)
    : 0;
  const deviation = itemProgress - plannedProgress;

  const achieved = items.filter(item => item.status === 'DONE');
  const pending = items
    .filter(item => item.status !== 'DONE')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.daysLeft - b.daysLeft);

  /* ---- Isu terdeteksi sistem ---- */
  const systemIssues: NarrativeItem[] = [];
  const overdue = pending.filter(item => item.overdueDays > 0);
  const dueSoon = pending.filter(item => item.overdueDays === 0 && item.daysLeft <= 30 && item.progress < 100);
  const notStarted = pending.filter(item => item.status === 'NOT_STARTED');
  const bigGap = pending.filter(item => item.deviation <= -40 && item.status !== 'NOT_STARTED');

  if (overdue.length) {
    systemIssues.push({
      title: `${overdue.length} sub task melewati target`,
      detail: overdue.map(item => `${item.subTaskName} (${item.overdueDays} hari)`).join('; '),
    });
  }
  if (dueSoon.length) {
    systemIssues.push({
      title: `${dueSoon.length} sub task jatuh tempo ≤ 30 hari`,
      detail: dueSoon
        .map(item => `${item.subTaskName} – ${item.progress}%, target ${formatDateId(item.dueDate)}`)
        .join('; '),
    });
  }
  if (bigGap.length) {
    systemIssues.push({
      title: `${bigGap.length} sub task tertinggal jauh dari rencana`,
      detail: bigGap
        .slice(0, 4)
        .map(item => `${item.subTaskName} (aktual ${item.progress}% vs rencana ${item.plannedProgress}%)`)
        .join('; '),
    });
  }
  if (notStarted.length) {
    systemIssues.push({
      title: `${notStarted.length} sub task belum dimulai`,
      detail: `Sisa waktu RKM ${Math.max(0, daysBetween(asOf, program.endDate || '2026-12-31'))} hari. ${notStarted
        .slice(0, 4)
        .map(item => item.subTaskName + (item.waitingFor ? ` (menunggu: ${item.waitingFor})` : ''))
        .join('; ')}${notStarted.length > 4 ? '; dst.' : ''}`,
    });
  }

  /* ---- Langkah strategis: dikelompokkan per kategori isu ---- */
  const grouped = new Map<string, ReportItem[]>();
  pending.forEach(item => {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category)!.push(item);
  });

  const actions: StrategicAction[] = Array.from(grouped.entries()).map(([category, list]) => {
    const top = [...list].sort(
      (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.daysLeft - b.daysLeft,
    );
    const priority = top[0].priority;
    const nearest = [...list].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    const rule = classify(top[0].subTaskName + ' ' + top[0].taskName);
    return {
      programName: program.name,
      issue: `${category}: ${list.length} sub task belum tuntas (${top
        .slice(0, 3)
        .map(item => item.subTaskName)
        .join('; ')}${list.length > 3 ? '; dst.' : ''})`,
      impact: rule.impact,
      step: rule.step,
      pic: program.pic || top[0].pic,
      target: formatDateId(nearest?.dueDate),
      priority,
    };
  });
  actions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  const rkmActual = program.rkm?.actual ?? null;
  const rkmBaseline = program.rkm?.baseline ?? null;

  // Skor kesehatan program (0-100):
  // 100 − selisih progres di bawah rencana jadwal − 10×sub task lewat target
  //     − 5×sub task jatuh tempo ≤30 hari − 5×poin aktual RKM di bawah baseline − 5×sub task tertunda
  const rkmGap = rkmActual !== null && rkmBaseline !== null ? Math.max(0, rkmBaseline - rkmActual) : 0;
  const healthScore = Math.round(
    clamp(
      100 -
        Math.max(0, -deviation) -
        overdue.length * 10 -
        dueSoon.length * 5 -
        rkmGap * 5 -
        counts.DELAYED * 5,
    ),
  );
  const condition: ProgramCondition =
    healthScore >= HEALTH_THRESHOLDS.onTrack
      ? 'Sesuai Target'
      : healthScore >= HEALTH_THRESHOLDS.attention
        ? 'Perlu Perhatian'
        : 'Kritis';

  return {
    id: program.id,
    code: program.code || '-',
    name: program.name,
    pic: program.pic || '-',
    startDate: program.startDate || '2026-01-01',
    endDate: program.endDate || '2026-12-31',
    rkmActual,
    rkmBaseline,
    rkmStatus: program.rkm?.status || 'On Progress',
    systemProgress: clamp(itemProgress),
    plannedProgress: clamp(plannedProgress),
    deviation,
    counts,
    achievementRate: counts.total ? Math.round((counts.DONE / counts.total) * 100) : 0,
    healthScore,
    condition,
    tasks,
    capaian: program.capaian || [],
    isu: program.isu || [],
    systemIssues,
    nextStep: program.nextStep || [],
    achieved,
    pending,
    actions,
  };
}

/* ---------------------------------------------------------------------
 * Builder keseluruhan
 * ------------------------------------------------------------------- */
export function buildReport(
  programs: Program[],
  options: { asOf: string; periodStart: string; rkm?: RkmSummary | null; includeRkmHeader?: boolean },
): OverallReport {
  const programReports = programs.map(program => buildProgramReport(program, options.asOf));
  const counts = emptyCounts();
  programReports.forEach(report => {
    (['DONE', 'WIP', 'NOT_STARTED', 'DELAYED'] as SubTaskStatus[]).forEach(key => {
      counts[key] += report.counts[key];
    });
    counts.total += report.counts.total;
  });

  const allItems = programReports.flatMap(report => [...report.achieved, ...report.pending]);
  const systemProgress = allItems.length
    ? Math.round(allItems.reduce((sum, item) => sum + item.progress, 0) / allItems.length)
    : 0;
  const plannedProgress = allItems.length
    ? Math.round(allItems.reduce((sum, item) => sum + item.plannedProgress, 0) / allItems.length)
    : 0;
  const overdueCount = allItems.filter(item => item.overdueDays > 0).length;
  const dueSoonCount = allItems.filter(
    item => item.status !== 'DONE' && item.overdueDays === 0 && item.daysLeft <= 30,
  ).length;

  const withRkm = programReports.filter(report => report.rkmActual !== null);
  const useHeader = options.includeRkmHeader && options.rkm;
  const rkmActual = useHeader
    ? options.rkm!.actual
    : withRkm.length
      ? Math.round(withRkm.reduce((sum, report) => sum + (report.rkmActual || 0), 0) / withRkm.length)
      : null;
  const rkmBaseline = useHeader
    ? options.rkm!.baseline
    : withRkm.length
      ? Math.round(withRkm.reduce((sum, report) => sum + (report.rkmBaseline || 0), 0) / withRkm.length)
      : null;

  const actions = programReports
    .flatMap(report => report.actions)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  const daysToYearEnd = Math.max(0, daysBetween(options.asOf, options.rkm?.endDate || '2026-12-31'));
  const achievementRate = counts.total ? Math.round((counts.DONE / counts.total) * 100) : 0;

  /* ---- Ringkasan eksekutif (narasi otomatis) ---- */
  const executiveSummary: string[] = [];
  if (rkmActual !== null && rkmBaseline !== null) {
    const gap = rkmActual - rkmBaseline;
    executiveSummary.push(
      `Realisasi RKM pengadaan tanah mencapai ${rkmActual}% terhadap target baseline ${rkmBaseline}% ` +
        `(${gap >= 0 ? 'lebih tinggi' : 'lebih rendah'} ${Math.abs(gap)} poin), sehingga secara umum program ` +
        `${gap >= 0 ? 'berjalan sesuai rencana' : 'berada di bawah rencana'}.`,
    );
  }
  executiveSummary.push(
    `Dari ${counts.total} sub task pada ${programReports.length} program, ${counts.DONE} sub task (${achievementRate}%) telah tercapai, ` +
      `${counts.WIP} sedang berproses, ${counts.NOT_STARTED} belum dimulai` +
      (counts.DELAYED ? `, dan ${counts.DELAYED} tertunda` : '') +
      `. Rata-rata progres sub task ${systemProgress}% dibanding rencana jadwal ${plannedProgress}%.`,
  );
  const critical = programReports.filter(report => report.condition !== 'Sesuai Target');
  if (critical.length) {
    executiveSummary.push(
      `Program yang memerlukan perhatian: ${critical
        .map(report => `${report.name} (${report.condition.toLowerCase()})`)
        .join(', ')}. Isu dominan berada pada ${topCategories(allItems).join(', ')}.`,
    );
  }
  executiveSummary.push(
    `Dengan sisa waktu ${daysToYearEnd} hari hingga akhir periode RKM, fokus tindak lanjut adalah ` +
      `${actions
        .filter(action => action.priority === 'Tinggi')
        .slice(0, 3)
        .map(action => action.issue.split(':')[0])
        .filter((value, index, array) => array.indexOf(value) === index)
        .join(', ') || 'menjaga ritme monitoring mingguan'}.`,
  );

  /* ---- Temuan utama ---- */
  const keyFindings: string[] = [];
  programReports.forEach(report => {
    const doneTasks = report.tasks.filter(task => task.progress === 100).map(task => task.name);
    if (doneTasks.length) keyFindings.push(`${report.name}: task tuntas – ${doneTasks.join('; ')}.`);
  });
  if (overdueCount) keyFindings.push(`${overdueCount} sub task telah melewati tanggal target.`);
  if (dueSoonCount) keyFindings.push(`${dueSoonCount} sub task akan jatuh tempo dalam 30 hari ke depan.`);
  if (counts.NOT_STARTED)
    keyFindings.push(
      `${counts.NOT_STARTED} sub task belum dimulai dan sebagian besar bergantung pada penyelesaian tahapan sebelumnya.`,
    );

  return {
    asOf: options.asOf,
    periodStart: options.periodStart,
    periodEnd: options.rkm?.endDate || '2026-12-31',
    rkm: options.rkm || null,
    rkmActual,
    rkmBaseline,
    systemProgress,
    plannedProgress,
    deviation: systemProgress - plannedProgress,
    totals: {
      programs: programs.length,
      tasks: programs.reduce((sum, program) => sum + program.tasks.length, 0),
      subTasks: counts.total,
    },
    counts,
    achievementRate,
    overdueCount,
    dueSoonCount,
    daysToYearEnd,
    programs: programReports,
    actions,
    executiveSummary,
    keyFindings,
  };
}

function topCategories(items: ReportItem[]) {
  const map = new Map<string, number>();
  items
    .filter(item => item.status !== 'DONE')
    .forEach(item => map.set(item.category, (map.get(item.category) || 0) + 1));
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);
}

/* ---------------------------------------------------------------------
 * Gauge meter (SVG string) – dipakai di UI & dokumen cetak
 * ------------------------------------------------------------------- */
export function gaugeColor(actual: number, baseline: number | null) {
  if (baseline === null) return actual >= 70 ? '#16A34A' : actual >= 40 ? '#2563EB' : '#F59E0B';
  if (actual >= baseline) return '#16A34A';
  if (actual >= baseline - 5) return '#F59E0B';
  return '#DC2626';
}

export function gaugeSvg(
  actual: number,
  baseline: number | null,
  options: { size?: number; label?: string; trackColor?: string; textColor?: string } = {},
) {
  const size = options.size ?? 180;
  const stroke = Math.round(size * 0.11);
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const height = Math.round(size / 2 + stroke * 1.4);
  const value = clamp(actual);
  const color = gaugeColor(value, baseline);
  const track = options.trackColor ?? '#E2E8F0';
  const text = options.textColor ?? '#0B2A63';

  const point = (percent: number, r = radius) => {
    const angle = Math.PI * (1 - percent / 100);
    return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)];
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  let marker = '';
  if (baseline !== null) {
    const b = clamp(baseline);
    const [ix, iy] = point(b, radius - stroke * 0.85);
    const [ox, oy] = point(b, radius + stroke * 0.85);
    marker = `<line x1="${ix.toFixed(2)}" y1="${iy.toFixed(2)}" x2="${ox.toFixed(2)}" y2="${oy.toFixed(2)}" stroke="${text}" stroke-width="${Math.max(2, stroke * 0.22)}" stroke-linecap="round"/>`;
  }

  const ticks = [0, 25, 50, 75, 100]
    .map(percent => {
      const [x1, y1] = point(percent, radius - stroke * 0.62);
      const [x2, y2] = point(percent, radius - stroke * 0.38);
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1.5"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${height}" width="100%" style="max-width:${size}px" role="img" aria-label="${options.label ?? 'Progres'} ${value}%">
  <path d="${arc(0, 100)}" fill="none" stroke="${track}" stroke-width="${stroke}" stroke-linecap="round"/>
  ${value > 0 ? `<path d="${arc(0, Math.max(value, 0.5))}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/>` : ''}
  ${ticks}
  ${marker}
  <text x="${cx}" y="${cy - stroke * 0.25}" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="${(size * 0.2).toFixed(0)}" font-weight="800" fill="${text}">${value}%</text>
  <text x="${stroke / 2}" y="${height - 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${(size * 0.065).toFixed(0)}" fill="#94A3B8">0</text>
  <text x="${size - stroke / 2}" y="${height - 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${(size * 0.065).toFixed(0)}" fill="#94A3B8">100</text>
</svg>`;
}
