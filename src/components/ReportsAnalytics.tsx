import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Info,
  MapPin,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  Cell,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { Program } from '../types';
import { RKM_SUMMARY } from '../data';
import { CURRENT_DATE_STR, statusLabel } from '../utils';
import {
  buildReport,
  formatDateId,
  gaugeSvg,
  OverallReport,
  PRIORITY_RANK,
  ProgramReport,
  ReportItem,
} from '../reportEngine';
import { buildPrintableReport, exportReportExcel, openPrintableReport } from '../reportExport';

interface ReportsAnalyticsProps {
  programs?: any[];
}

type HealthStatus = 'SEHAT' | 'PERLU PERHATIAN' | 'KRITIS';

interface AnalysisRow {
  id: string;
  programId: string;
  programName: string;
  locationName: string;
  taskId: string;
  taskName: string;
  subTaskId: string;
  subTaskName: string;
  pic: string;
  status: string;
  progress: number;
  startDate: string;
  targetDate: string;
  priorityText: string;
  weight: number;
  budget: string;
  notes: string;
  plannedProgress: number;
  deviation: number;
  overdueDays: number;
  impact: number;
  urgency: number;
  dependency: number;
  likelihood: number;
  riskScore: number;
  priorityScore: number;
  riskCategory: string;
}

interface ProgramHealth {
  id: string;
  name: string;
  progress: number;
  plannedProgress: number;
  deviation: number;
  healthScore: number;
  healthStatus: HealthStatus;
}

const DAY_MS = 1000 * 60 * 60 * 24;

const getText = (...values: any[]) => {
  const value = values.find(
    item =>
      item !== undefined &&
      item !== null &&
      String(item).trim() !== '',
  );

  return value === undefined || value === null ? '' : String(value);
};

const getNumber = (...values: any[]) => {
  const value = values.find(
    item =>
      item !== undefined &&
      item !== null &&
      item !== '' &&
      !Number.isNaN(Number(item)),
  );

  return value === undefined ? 0 : Number(value);
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const parseDate = (value?: string) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toInputDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDate = (value?: string, short = false) => {
  const date = parseDate(value);
  if (!date) return value || '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: short ? 'short' : 'long',
    year: 'numeric',
  }).format(date);
};

const formatMonthDay = (value: string) => {
  const date = parseDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(date);
};

const getProgramTasks = (program: any) =>
  program?.tasks ||
  program?.taskList ||
  program?.taskLists ||
  program?.children ||
  [];

const getTaskSubTasks = (task: any) =>
  task?.subTasks ||
  task?.subtasks ||
  task?.subTaskList ||
  task?.children ||
  [];

const normalizeStatus = (value?: string) => {
  const status = String(value || 'WIP').trim().toUpperCase();

  if (status === 'SELESAI') return 'DONE';
  if (status === 'TERTUNDA') return 'DELAYED';
  if (status === 'PROSES') return 'WIP';
  if (status === 'BELUM MULAI') return 'NOT_STARTED';

  return status || 'WIP';
};

const daysDifference = (from: Date, to: Date) =>
  Math.ceil((to.getTime() - from.getTime()) / DAY_MS);

const getLocationName = (programName: string) => {
  const text = programName.toLowerCase();

  if (text.includes('terminal kijing')) return 'Terminal Kijing';
  if (text.includes('npea')) return 'NPEA';
  if (text.includes('regional') || text.includes('cabang')) return 'Regional / Cabang';
  if (text.includes('grogol')) return 'Grogol';

  return 'Lainnya';
};

const linearPlannedProgress = (
  startDate: string,
  targetDate: string,
  asOfDate: Date,
) => {
  const start = parseDate(startDate);
  const target = parseDate(targetDate);

  if (!start || !target) return 0;
  if (asOfDate <= start) return 0;
  if (asOfDate >= target) return 100;

  const duration = target.getTime() - start.getTime();
  if (duration <= 0) return 100;

  return clamp(
    ((asOfDate.getTime() - start.getTime()) / duration) * 100,
  );
};

const actualProgressAtDate = (
  row: Pick<AnalysisRow, 'progress' | 'startDate'>,
  pointDate: Date,
  reportEndDate: Date,
) => {
  const start = parseDate(row.startDate);
  if (!start) return 0;

  if (pointDate <= start) return 0;
  if (pointDate >= reportEndDate) return row.progress;

  const duration = reportEndDate.getTime() - start.getTime();
  if (duration <= 0) return row.progress;

  return clamp(
    (row.progress * (pointDate.getTime() - start.getTime())) /
      duration,
    0,
    row.progress,
  );
};

const deriveImpact = (status: string, priorityText: string, taskName: string, notes: string) => {
  const explicitPriority = priorityText.toLowerCase();
  const text = `${taskName} ${notes}`.toLowerCase();

  if (explicitPriority.includes('high') || explicitPriority.includes('tinggi')) return 5;
  if (text.includes('sertip') || text.includes('konsinyasi') || text.includes('penlok')) return 5;
  if (status === 'DELAYED') return 4;
  if (status === 'WIP') return 3;

  return 2;
};

const deriveUrgency = (status: string, targetDate: string, asOfDate: Date) => {
  if (status === 'DONE') return 1;

  const target = parseDate(targetDate);
  if (!target) return 2;

  const days = daysDifference(asOfDate, target);
  if (days < -30) return 5;
  if (days < 0) return 4;
  if (days <= 14) return 3;
  if (days <= 30) return 2;
  return 1;
};

const deriveDependency = (taskName: string, siblingCount: number) => {
  const text = taskName.toLowerCase();
  if (text.includes('sertip') || text.includes('konsinyasi')) return 5;
  if (siblingCount >= 6) return 4;
  if (siblingCount >= 4) return 3;
  return 2;
};

const deriveLikelihood = (status: string, overdueDays: number, deviation: number) => {
  if (status === 'DONE') return 1;
  if (overdueDays > 30) return 5;
  if (overdueDays > 0) return 4;
  if (deviation < -20) return 4;
  if (status === 'DELAYED' || deviation < -10) return 3;
  return 2;
};

const classifyRiskCategory = (taskName: string, subTaskName: string, notes: string) => {
  const text = `${taskName} ${subTaskName} ${notes}`.toLowerCase();

  if (/dokumen|administrasi|verifikasi|surat|berita acara/.test(text)) return 'Administrasi';
  if (/notaris|ppat|legal|kejati|hukum/.test(text)) return 'Legal';
  if (/anggaran|pnbp|pembayaran|ganti kerugian|ugr|biaya/.test(text)) return 'Dokumen';
  if (/ahli waris|stakeholder|pihak|koordinasi|gubernur|bupati/.test(text)) return 'Stakeholder';
  if (/konstruksi|pembangunan|land clearing|teknis/.test(text)) return 'Teknis';
  if (/sertip|penlok|hgb|hpl|bpn|tanah|lahan/.test(text)) return 'Pertanahan';

  return 'Operasional';
};

const weightedAverage = (rows: AnalysisRow[], field: 'progress' | 'plannedProgress') => {
  if (!rows.length) return 0;

  const totalWeight = rows.reduce((sum, row) => sum + (row.weight || 1), 0);
  if (!totalWeight) return 0;

  return Math.round(
    rows.reduce((sum, row) => sum + row[field] * (row.weight || 1), 0) / totalWeight,
  );
};

const flattenRows = (programs: any[], asOfDate: Date) => {
  const rows: AnalysisRow[] = [];

  programs.forEach((program, programIndex) => {
    const programId = getText(program?.id, program?.programId, `program-${programIndex}`);
    const programName = getText(program?.name, program?.programName, program?.title, `Program ${programIndex + 1}`);
    const locationName = getLocationName(programName);

    const tasks = getProgramTasks(program);
    if (!Array.isArray(tasks)) return;

    tasks.forEach((task: any, taskIndex: number) => {
      const taskId = getText(task?.id, task?.taskId, `${programId}-task-${taskIndex}`);
      const taskName = getText(task?.name, task?.taskName, task?.title, task?.['Task List (RKM/Non)'], `Task ${taskIndex + 1}`);

      const subTasks = getTaskSubTasks(task);
      if (!Array.isArray(subTasks)) return;

      subTasks.forEach((subTask: any, subIndex: number) => {
        const subTaskId = getText(subTask?.id, subTask?.subTaskId, `${taskId}-sub-${subIndex}`);
        const subTaskName = getText(subTask?.name, subTask?.subTaskName, subTask?.title, subTask?.['Sub Task'], `Sub Task ${subIndex + 1}`);
        const status = normalizeStatus(getText(subTask?.status, subTask?.state));
        const progress = clamp(getNumber(subTask?.progress, subTask?.progressPercent, subTask?.['Progress %']));
        const startDate = getText(subTask?.startDate, subTask?.tglMulai, subTask?.start, subTask?.['Tgl Mulai']);
        const targetDate = getText(subTask?.dueDate, subTask?.targetDate, subTask?.endDate, subTask?.tglTarget, subTask?.['Tgl Target']);
        const priorityText = getText(subTask?.priority, subTask?.prioritas, subTask?.['Prioritas (Custom Header)'], '-');
        const weightRaw = getNumber(subTask?.weight, subTask?.bobot, subTask?.['Bobot % (Custom Header)']);
        const weight = weightRaw > 0 ? weightRaw : 1;
        const budget = getText(subTask?.budget, subTask?.anggaran, subTask?.['Anggaran (Custom Header)'], '-');
        const notes = getText(subTask?.notes, subTask?.hambatan, subTask?.keterangan, subTask?.['Hambatan / Keterangan'], '-');

        const plannedProgress = Math.round(linearPlannedProgress(startDate, targetDate, asOfDate));
        const deviation = Math.round(progress - plannedProgress);

        const target = parseDate(targetDate);
        const overdueDays =
          target && status !== 'DONE' && asOfDate > target
            ? Math.ceil((asOfDate.getTime() - target.getTime()) / DAY_MS)
            : 0;

        const impact = deriveImpact(status, priorityText, taskName, notes);
        const urgency = deriveUrgency(status, targetDate, asOfDate);
        const dependency = deriveDependency(taskName, subTasks.length);
        const likelihood = deriveLikelihood(status, overdueDays, deviation);
        const riskScore = impact * likelihood;
        const scheduleDeviationRating = deviation >= 0 ? 1 : deviation >= -10 ? 2 : deviation >= -20 ? 3 : deviation >= -30 ? 4 : 5;
        const priorityScore =
          status === 'DONE'
            ? 0
            : Math.round((impact * 0.35 + urgency * 0.3 + scheduleDeviationRating * 0.2 + dependency * 0.15) * 20);

        rows.push({
          id: `${programId}-${taskId}-${subTaskId}`,
          programId,
          programName,
          locationName,
          taskId,
          taskName,
          subTaskId,
          subTaskName,
          pic: getText(subTask?.pic, subTask?.PIC, subTask?.personInCharge, task?.pic, task?.PIC, '-'),
          status,
          progress,
          startDate,
          targetDate,
          priorityText,
          weight,
          budget,
          notes,
          plannedProgress,
          deviation,
          overdueDays,
          impact,
          urgency,
          dependency,
          likelihood,
          riskScore,
          priorityScore,
          riskCategory: classifyRiskCategory(taskName, subTaskName, notes),
        });
      });
    });
  });

  return rows;
};

const buildTimeSeries = (rows: AnalysisRow[], startDate: Date, endDate: Date) => {
  const points: Array<{
    date: string;
    label: string;
    actual: number;
    target: number;
    deviationBar: number;
    deviation: number;
  }> = [];

  const totalWeight = rows.reduce((sum, row) => sum + (row.weight || 1), 0) || 1;

  const safeStart = new Date(startDate);
  const safeEnd = new Date(endDate);

  for (let cursor = new Date(safeStart); cursor <= safeEnd; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const target = Math.round(
      rows.reduce((sum, row) => {
        return (
          sum +
          linearPlannedProgress(row.startDate, row.targetDate, cursor) * (row.weight || 1)
        );
      }, 0) / totalWeight,
    );

    const actual = Math.round(
      rows.reduce((sum, row) => {
        return sum + actualProgressAtDate(row, cursor, safeEnd) * (row.weight || 1);
      }, 0) / totalWeight,
    );

    const deviation = actual - target;

    points.push({
      date: toInputDate(cursor),
      label: formatMonthDay(toInputDate(cursor)),
      actual,
      target,
      deviationBar: Math.abs(deviation),
      deviation,
    });
  }

  return points;
};

const RISK_COLORS: Record<string, string> = {
  Administrasi: '#2563EB',
  Legal: '#EF4444',
  Dokumen: '#F59E0B',
  Stakeholder: '#22C55E',
  Teknis: '#A855F7',
  Pertanahan: '#0891B2',
  Operasional: '#64748B',
};

function ToneCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  showProgress,
}: {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  showProgress?: number;
}) {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-violet-50 text-violet-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneMap[tone]}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-[#0B2A63]">{title}</p>
          <div className="mt-1 text-[18px] font-extrabold text-[#0B2A63]">{value}</div>

          {typeof showProgress === 'number' && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${showProgress}%` }}
              />
            </div>
          )}

          <p className="mt-2 text-[10px] text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ status }: { status: HealthStatus }) {
  const className =
    status === 'SEHAT'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'PERLU PERHATIAN'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-red-50 text-red-600';

  return (
    <span className={`inline-flex rounded-lg px-2.5 py-1 text-[9px] font-bold ${className}`}>
      {status === 'SEHAT' ? 'SESUAI TARGET' : status}
    </span>
  );
}

function RecommendationItem({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: 'red' | 'amber' | 'green' | 'blue';
}) {
  const icon =
    tone === 'red' ? (
      <ShieldAlert size={16} />
    ) : tone === 'amber' ? (
      <AlertTriangle size={16} />
    ) : tone === 'green' ? (
      <CheckCircle2 size={16} />
    ) : (
      <Info size={16} />
    );

  const boxClass =
    tone === 'red'
      ? 'bg-red-50 text-red-600'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-600'
        : tone === 'green'
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-blue-50 text-blue-600';

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${boxClass}`}>{icon}</div>
      <div>
        <p className="text-[11px] font-bold text-[#0B2A63]">{title}</p>
        <p className="mt-1 text-[10px] text-slate-500">{detail}</p>
      </div>
      <ChevronRight size={14} className="text-slate-300" />
    </div>
  );
}

function MatrixTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as AnalysisRow | undefined;
  if (!row) return null;

  return (
    <div className="max-w-[240px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-[11px] font-bold text-[#0B2A63]">{row.subTaskName}</p>
      <p className="mt-1 text-[10px] text-slate-500">{row.programName}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
        <span>Impact: {row.impact}/5</span>
        <span>Urgency: {row.urgency}/5</span>
        <span>Priority: {row.priorityScore}</span>
        <span>Risk: {row.riskScore}/25</span>
      </div>
    </div>
  );
}

export default function ReportsAnalytics({ programs = [] }: ReportsAnalyticsProps) {
  const [startDate, setStartDate] = useState(RKM_SUMMARY.startDate);
  const [endDate, setEndDate] = useState(CURRENT_DATE_STR);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [achievementTab, setAchievementTab] = useState<'pending' | 'achieved'>('pending');
  const [achievementProgram, setAchievementProgram] = useState('ALL');
  const [achievementTask, setAchievementTask] = useState('ALL');
  const [selectedProgramId, setSelectedProgramId] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  const reportStartDate = useMemo(() => parseDate(startDate) || new Date(RKM_SUMMARY.startDate), [startDate]);
  const reportEndDate = useMemo(() => parseDate(endDate) || new Date(CURRENT_DATE_STR), [endDate]);

  const allRows = useMemo(
    () => flattenRows(programs, reportEndDate),
    [programs, reportEndDate],
  );

  const locations = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach(row => set.add(row.locationName));
    return Array.from(set);
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      const programMatch = selectedProgramId === 'ALL' || row.programId === selectedProgramId;
      const locationMatch = selectedLocation === 'ALL' || row.locationName === selectedLocation;
      return programMatch && locationMatch;
    });
  }, [allRows, selectedProgramId, selectedLocation]);


  const filteredPrograms = useMemo(
    () =>
      (programs as Program[]).filter(program => {
        const programMatch = selectedProgramId === 'ALL' || program.id === selectedProgramId;
        const locationMatch =
          selectedLocation === 'ALL' || getLocationName(program.name || '') === selectedLocation;
        return programMatch && locationMatch;
      }),
    [programs, selectedProgramId, selectedLocation],
  );

  const isAllSelected = selectedProgramId === 'ALL' && selectedLocation === 'ALL';

  const report: OverallReport = useMemo(
    () =>
      buildReport(filteredPrograms, {
        asOf: toInputDate(reportEndDate),
        periodStart: toInputDate(reportStartDate),
        rkm: RKM_SUMMARY,
        includeRkmHeader: isAllSelected,
      }),
    [filteredPrograms, reportEndDate, reportStartDate, isAllSelected],
  );

  // Kesehatan program memakai skor yang sama dengan kartu program & dokumen export.
  const programHealth: ProgramHealth[] = useMemo(
    () =>
      report.programs.map(program => ({
        id: program.id,
        name: program.name,
        progress: program.systemProgress,
        plannedProgress: program.plannedProgress,
        deviation: program.deviation,
        healthScore: program.healthScore,
        healthStatus:
          program.condition === 'Sesuai Target'
            ? 'SEHAT'
            : program.condition === 'Perlu Perhatian'
              ? 'PERLU PERHATIAN'
              : 'KRITIS',
      })),
    [report],
  );

  const overallProgress = report.systemProgress;
  const targetProgress = report.plannedProgress;
  const overallDeviation = overallProgress - targetProgress;

  const healthyCount = programHealth.filter(item => item.healthStatus === 'SEHAT').length;
  const attentionCount = programHealth.filter(item => item.healthStatus === 'PERLU PERHATIAN').length;
  const criticalCount = programHealth.filter(item => item.healthStatus === 'KRITIS').length;
  const overdueCount = filteredRows.filter(row => row.overdueDays > 0).length;

  const matrixData = useMemo(
    () =>
      filteredRows
        .filter(row => row.status !== 'DONE')
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 8)
        .map((row, index) => ({
          ...row,
          x: row.urgency,
          y: row.impact,
          z: Math.max(80, row.priorityScore * 2.2),
          label: index + 1,
        })),
    [filteredRows],
  );

  const topPriorities = useMemo(
    () =>
      filteredRows
        .filter(row => row.status !== 'DONE')
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 5),
    [filteredRows],
  );

  const timeSeries = useMemo(
    () => buildTimeSeries(filteredRows, reportStartDate, reportEndDate),
    [filteredRows, reportStartDate, reportEndDate],
  );

  const riskDistribution = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredRows
      .filter(row => row.status !== 'DONE' && row.riskScore >= 5)
      .forEach(row => {
        grouped.set(row.riskCategory, (grouped.get(row.riskCategory) || 0) + 1);
      });

    const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);

    return Array.from(grouped.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: total ? Number(((value / total) * 100).toFixed(1)) : 0,
        color: RISK_COLORS[name] || '#64748B',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  const totalRiskItems = riskDistribution.reduce((sum, item) => sum + item.value, 0);

  const strategicRecommendations = useMemo(() => {
    const result: Array<{ title: string; detail: string; tone: 'red' | 'amber' | 'green' | 'blue' }> = [];

    report.programs
      .map(program => program.actions[0])
      .filter(Boolean)
      .forEach(action => {
      result.push({
        title: action.issue.split(':')[0] + ` · ${action.programName}`,
        detail: action.step,
        tone: action.priority === 'Tinggi' ? 'red' : action.priority === 'Sedang' ? 'amber' : 'blue',
      });
      });
    if (result.length) return result;

    const criticalPriority = filteredRows.filter(
      row => row.status !== 'DONE' && row.priorityScore >= 80,
    );
    const bigDeviation = filteredRows.filter(
      row => row.status !== 'DONE' && row.deviation < -20,
    );
    const overdue = filteredRows.filter(row => row.overdueDays > 0);
    const legalDocRisk = filteredRows.filter(
      row => row.riskCategory === 'Legal' || row.riskCategory === 'Administrasi',
    );

    if (criticalPriority.length) {
      result.push({
        title: `${criticalPriority.length} pekerjaan membutuhkan tindakan segera`,
        detail: 'Lihat detail pada Priority Matrix – kuadran Act Now dan prioritaskan tindak lanjut PIC.',
        tone: 'red',
      });
    }

    if (bigDeviation.length) {
      result.push({
        title: `${bigDeviation.length} pekerjaan mengalami deviasi progress signifikan`,
        detail: 'Review target dan percepat pelaksanaan untuk mengurangi gap terhadap rencana.',
        tone: 'amber',
      });
    }

    if (legalDocRisk.length) {
      result.push({
        title: `Dokumen/legal ${legalDocRisk.length} bidang tanah perlu perhatian`,
        detail: 'Segera lengkapi untuk menghindari keterlambatan lanjutan pada tahapan berikutnya.',
        tone: 'green',
      });
    }

    if (!result.length && !overdue.length) {
      result.push({
        title: 'Kondisi program relatif stabil pada filter aktif',
        detail: 'Pertahankan update progress dan monitoring berkala untuk menjaga performa program.',
        tone: 'blue',
      });
    }

    return result.slice(0, 3);
  }, [filteredRows, report]);

  const criticalAlerts = useMemo(
    () =>
      filteredRows
        .filter(
          row => row.status !== 'DONE' && (row.priorityScore >= 55 || row.overdueDays > 0),
        )
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 4),
    [filteredRows],
  );

  const programLabel =
    selectedProgramId === 'ALL'
      ? 'Semua Program'
      : (programs as Program[]).find(program => program.id === selectedProgramId)?.name || selectedProgramId;
  const locationLabel = selectedLocation === 'ALL' ? 'Semua Lokasi' : selectedLocation;

  const exportPrintable = () => {
    setExportMenuOpen(false);
    openPrintableReport(buildPrintableReport(report, { programLabel, locationLabel }));
  };

  const exportExcelReport = () => {
    setExportMenuOpen(false);
    exportReportExcel(report, `Laporan_Monitoring_Pengadaan_Tanah_${endDate}.xlsx`);
  };

  const exportReport = () => {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(
      programHealth.map(item => ({
        Program: item.name,
        'Health Score': item.healthScore,
        Status: item.healthStatus,
        'Progress Aktual (%)': item.progress,
        'Target Saat Ini (%)': item.plannedProgress,
        'Deviasi (%)': item.deviation,
      })),
    );

    const detailSheet = XLSX.utils.json_to_sheet(
      filteredRows.map((row, index) => ({
        No: index + 1,
        Program: row.programName,
        Lokasi: row.locationName,
        'Task List': row.taskName,
        'Sub Task': row.subTaskName,
        PIC: row.pic,
        Status: statusLabel(row.status),
        'Progress Aktual': row.progress,
        'Target Saat Ini': row.plannedProgress,
        Deviasi: row.deviation,
        'Priority Score': row.priorityScore,
        'Risk Score': row.riskScore,
        'Tgl Mulai': row.startDate,
        'Tgl Target': row.targetDate,
        Hambatan: row.notes,
      })),
    );

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Analitik');

    XLSX.writeFile(workbook, `Laporan_Analitik_${endDate}.xlsx`);
  };

  const selectedProgramCount = programHealth.length;
  const timeSeriesLatest = timeSeries[timeSeries.length - 1];

  return (
    <div className="space-y-4 text-[#102448]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
          <div>
            <label className="mb-2 block text-[11px] font-bold text-slate-700">Periode</label>
            <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#0B2A63]">
                <CalendarDays size={14} className="text-slate-500" />
                <span>
                  {formatDate(startDate, true)} - {formatDate(endDate, true)}
                </span>
              </div>
              <div className="hidden items-center gap-2 xl:flex">
                <input
                  type="date"
                  value={startDate}
                  onChange={event => setStartDate(event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[10px]"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={event => setEndDate(event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[10px]"
                />
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Posisi data laporan: {formatDate(endDate, true)}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold text-slate-700">Program Kerja</label>
            <select
              value={selectedProgramId}
              onChange={event => setSelectedProgramId(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-[#0B2A63] outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Program</option>
              {Array.from(new Map(allRows.map(row => [row.programId, row.programName])).entries()).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold text-slate-700">Wilayah / Lokasi</label>
            <div className="relative">
              <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedLocation}
                onChange={event => setSelectedLocation(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[11px] font-semibold text-[#0B2A63] outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Lokasi</option>
                {locations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen(open => !open)}
              aria-expanded={exportMenuOpen}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#082C61] px-5 text-[11px] font-bold text-white transition hover:bg-[#0B3C82]"
            >
              <Download size={15} />
              Export Laporan
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 z-30 mt-2 w-[270px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <button
                  type="button"
                  onClick={exportPrintable}
                  className="block w-full px-4 py-3 text-left hover:bg-slate-50"
                >
                  <p className="text-[11px] font-bold text-[#0B2A63]">Laporan Lengkap (PDF / Cetak)</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Gauge meter, ringkasan eksekutif, capaian, isu, langkah strategis</p>
                </button>
                <button
                  type="button"
                  onClick={exportExcelReport}
                  className="block w-full border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <p className="text-[11px] font-bold text-[#0B2A63]">Data Laporan (Excel)</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">7 sheet: ringkasan, per program, tercapai, pending, dst.</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportReport();
                  }}
                  className="block w-full border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <p className="text-[11px] font-bold text-[#0B2A63]">Data Analitik (Excel)</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Health score, priority & risk score per sub task</p>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <RkmHero report={report} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {report.programs.map(program => (
          <ProgramReportCard key={program.id} program={program} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <AchievementPanel
          report={report}
          tab={achievementTab}
          onTabChange={setAchievementTab}
          programId={achievementProgram}
          taskName={achievementTask}
          onProgramChange={value => {
            setAchievementProgram(value);
            setAchievementTask('ALL');
          }}
          onTaskChange={setAchievementTask}
        />
        <StrategicActionsPanel report={report} programId={achievementProgram} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ToneCard
          title="Overall Progress"
          value={`${overallProgress}%`}
          subtitle="Rata-rata seluruh program"
          icon={<TrendingUp size={18} />}
          tone="blue"
          showProgress={overallProgress}
        />
        <ToneCard
          title="Sesuai Target"
          value={healthyCount}
          subtitle={`${selectedProgramCount ? ((healthyCount / selectedProgramCount) * 100).toFixed(1) : 0}% dari total program`}
          icon={<CheckCircle2 size={18} />}
          tone="green"
        />
        <ToneCard
          title="Perlu Perhatian"
          value={attentionCount}
          subtitle={`${selectedProgramCount ? ((attentionCount / selectedProgramCount) * 100).toFixed(1) : 0}% dari total program`}
          icon={<AlertTriangle size={18} />}
          tone="amber"
        />
        <ToneCard
          title="Kritis"
          value={criticalCount}
          subtitle={`${selectedProgramCount ? ((criticalCount / selectedProgramCount) * 100).toFixed(1) : 0}% dari total program`}
          icon={<ShieldAlert size={18} />}
          tone="red"
        />
        <ToneCard
          title="Task Overdue"
          value={overdueCount}
          subtitle="Perlu tindakan segera"
          icon={<Clock3 size={18} />}
          tone="purple"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr_.55fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Program Health Overview</h3>
            <Info size={13} className="text-slate-400" />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-3">Program Kerja</th>
                  <th className="pb-3">Health Score</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Progress</th>
                  <th className="pb-3 text-right">Deviasi vs Rencana</th>
                </tr>
              </thead>
              <tbody>
                {programHealth.map(program => (
                  <tr key={program.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 pr-3">
                      <p className="text-[11px] font-bold leading-5 text-[#0B2A63]">{program.name}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <div
                        className={`grid h-11 w-11 place-items-center rounded-full border-[3px] text-[12px] font-extrabold ${
                          program.healthStatus === 'SEHAT'
                            ? 'border-emerald-400 text-emerald-700'
                            : program.healthStatus === 'PERLU PERHATIAN'
                              ? 'border-amber-400 text-amber-700'
                              : 'border-red-400 text-red-600'
                        }`}
                      >
                        {program.healthScore}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <HealthBadge status={program.healthStatus} />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="w-[90px]">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                          <span>{program.progress}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${program.progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${program.deviation >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {program.deviation >= 0 ? '+' : ''}
                        {program.deviation}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[9.5px] leading-4 text-slate-500">
            Skor = 100 − selisih progres di bawah rencana jadwal − 10 × sub task lewat target − 5 × sub task jatuh tempo ≤ 30 hari
            − 5 × poin aktual RKM di bawah baseline − 5 × sub task tertunda. ≥ 85 Sesuai Target · 65–84 Perlu Perhatian · &lt; 65 Kritis.
          </p>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Priority Matrix (Impact vs Urgency)</h3>
            <Info size={13} className="text-slate-400" />
          </div>

          <div className="mt-4 h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 8, bottom: 12, left: 8 }}>
                <CartesianGrid stroke="#E8EEF6" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Urgency" domain={[1, 5]} tickCount={5} fontSize={10} stroke="#6B7A90" />
                <YAxis type="number" dataKey="y" name="Impact" domain={[1, 5]} tickCount={5} fontSize={10} stroke="#6B7A90" />
                <ZAxis type="number" dataKey="z" range={[120, 320]} />
                <ReferenceLine x={3} stroke="#94A3B8" strokeDasharray="4 4" />
                <ReferenceLine y={3} stroke="#94A3B8" strokeDasharray="4 4" />
                <Tooltip content={<MatrixTooltip />} />
                <Scatter data={matrixData}>
                  {matrixData.map((point, index) => (
                    <Cell
                      key={`${point.id}-${index}`}
                      fill={
                        point.priorityScore >= 80
                          ? '#EF4444'
                          : point.priorityScore >= 60
                            ? '#F59E0B'
                            : point.priorityScore >= 40
                              ? '#22C55E'
                              : '#2563EB'
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="-mt-2 flex items-center justify-between text-[10px] font-bold">
            <span className="text-blue-600">PLAN</span>
            <span className="text-red-500">ACT NOW</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
            <span className="text-emerald-600">MONITOR</span>
            <span className="text-amber-500">SCHEDULE</span>
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Top Prioritas (Score Tertinggi)</h3>

          <div className="mt-4 space-y-2">
            {topPriorities.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex gap-3">
                  <div
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                      index === 0 ? 'bg-red-500' : index === 1 ? 'bg-red-500' : index === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11px] font-bold leading-4 text-[#0B2A63]">{item.subTaskName}</p>
                    <p className="mt-1 text-[10px] text-slate-500">Score: {item.priorityScore}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_.58fr_.72fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Progress vs Target</h3>
            <Info size={13} className="text-slate-400" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_120px]">
            <div className="h-[255px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeSeries} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#EDF2F7" vertical={false} />
                  <XAxis dataKey="label" fontSize={10} stroke="#7B8BA4" interval={Math.max(0, Math.floor(timeSeries.length / 5) - 1)} />
                  <YAxis fontSize={10} stroke="#7B8BA4" domain={[0, 100]} tickCount={6} />
                  <Tooltip
                    formatter={(value, name) => [
                      `${(Array.isArray(value) ? value[0] : value) ?? 0}%`,
                      name === 'target' ? 'Target (Rata-rata)' : name === 'actual' ? 'Aktual (Rata-rata)' : 'Deviasi',
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="deviationBar" name="Deviasi" fill="#F5B5BE" radius={[4, 4, 0, 0]} barSize={12} />
                  <Line type="monotone" dataKey="target" name="Target (Rata-rata)" stroke="#2563EB" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                  <Line type="monotone" dataKey="actual" name="Aktual (Rata-rata)" stroke="#1D4ED8" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-5 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-[10px] font-semibold text-slate-500">Target Saat Ini</p>
                <p className="mt-1 text-[16px] font-extrabold text-[#2563EB]">{timeSeriesLatest?.target ?? targetProgress}%</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500">Aktual Saat Ini</p>
                <p className="mt-1 text-[16px] font-extrabold text-[#1D4ED8]">{timeSeriesLatest?.actual ?? overallProgress}%</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500">Deviasi</p>
                <p className={`mt-1 text-[16px] font-extrabold ${overallDeviation >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {overallDeviation >= 0 ? '+' : ''}
                  {overallDeviation}%
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Distribusi Risiko</h3>
            <Info size={13} className="text-slate-400" />
          </div>

          <div className="mt-4 grid grid-cols-[150px_1fr] items-center gap-3">
            <div className="relative h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistribution} dataKey="value" innerRadius={42} outerRadius={72} paddingAngle={2} stroke="none">
                    {riskDistribution.map(item => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-[22px] font-extrabold text-[#0B2A63]">{totalRiskItems}</strong>
                <span className="text-[10px] text-slate-500">Total Risiko</span>
              </div>
            </div>

            <div className="space-y-2">
              {riskDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex items-center gap-2 font-semibold text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="text-slate-500">
                    {item.value} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Rekomendasi Strategis</h3>
            <Info size={13} className="text-slate-400" />
          </div>

          <div className="mt-4">
            {strategicRecommendations.map(item => (
              <RecommendationItem key={item.title} title={item.title} detail={item.detail} tone={item.tone} />
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Alert & Pekerjaan Kritis</h3>
          <Info size={13} className="text-slate-400" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-4">
          {criticalAlerts.map(item => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 ${
                item.priorityScore >= 80
                  ? 'border-red-100 bg-red-50/60'
                  : item.priorityScore >= 60
                    ? 'border-amber-100 bg-amber-50/60'
                    : 'border-blue-100 bg-blue-50/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                    item.priorityScore >= 80
                      ? 'bg-red-100 text-red-600'
                      : item.priorityScore >= 60
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="line-clamp-2 text-[11px] font-bold leading-4 text-[#0B2A63]">{item.subTaskName}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                    {item.overdueDays > 0 && (
                      <span className="font-semibold text-red-500">Overdue {item.overdueDays} hari</span>
                    )}
                    {item.overdueDays === 0 && (
                      <span className={`${item.deviation < 0 ? 'text-amber-600' : 'text-slate-500'} font-semibold`}>
                        Deviasi {item.deviation}%
                      </span>
                    )}
                    <span className="font-semibold text-slate-500">Priority Score: {item.priorityScore}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =====================================================================
 * Komponen laporan RKM (gauge, capaian, isu, langkah strategis)
 * ===================================================================== */

const CONDITION_STYLE: Record<string, string> = {
  'Sesuai Target': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Perlu Perhatian': 'bg-amber-50 text-amber-700 border-amber-200',
  Kritis: 'bg-red-50 text-red-600 border-red-200',
};

const PRIORITY_STYLE: Record<string, string> = {
  Tinggi: 'bg-red-50 text-red-600',
  Sedang: 'bg-amber-50 text-amber-700',
  Rendah: 'bg-slate-100 text-slate-600',
};

const ITEM_STATUS_STYLE: Record<string, string> = {
  DONE: 'bg-emerald-50 text-emerald-700',
  WIP: 'bg-blue-50 text-blue-700',
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  DELAYED: 'bg-red-50 text-red-600',
};

function Gauge({
  actual,
  baseline,
  size = 180,
  label,
  dark = false,
}: {
  actual: number;
  baseline: number | null;
  size?: number;
  label?: string;
  dark?: boolean;
}) {
  return (
    <div
      className="mx-auto w-full"
      style={{ maxWidth: size }}
      dangerouslySetInnerHTML={{
        __html: gaugeSvg(actual, baseline, {
          size,
          label,
          trackColor: dark ? 'rgba(255,255,255,0.22)' : '#E2E8F0',
          textColor: dark ? '#FFFFFF' : '#0B2A63',
        }),
      }}
    />
  );
}

function StatusSplitBar({ counts }: { counts: ProgramReport['counts'] }) {
  const total = counts.total || 1;
  const parts = [
    { key: 'DONE', value: counts.DONE, color: '#16A34A', label: 'Tercapai' },
    { key: 'WIP', value: counts.WIP, color: '#2563EB', label: 'Proses' },
    { key: 'NOT_STARTED', value: counts.NOT_STARTED, color: '#CBD5E1', label: 'Belum mulai' },
    { key: 'DELAYED', value: counts.DELAYED, color: '#EF4444', label: 'Tertunda' },
  ].filter(part => part.value > 0);

  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {parts.map(part => (
          <div key={part.key} style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {parts.map(part => (
          <span key={part.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: part.color }} />
            {part.label} <b className="text-[#0B2A63]">{part.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function RkmHero({ report }: { report: OverallReport }) {
  const hasRkm = report.rkmActual !== null;
  const actual = hasRkm ? report.rkmActual! : report.systemProgress;
  const baseline = hasRkm ? report.rkmBaseline : report.plannedProgress;
  const gap = actual - (baseline ?? 0);

  return (
    <section className="overflow-hidden rounded-[24px] bg-gradient-to-r from-[#063A70] via-[#074A8B] to-[#0B5AA8] p-5 text-white shadow-sm">
      <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[220px_1fr_260px]">
        <div className="rounded-2xl bg-white/10 p-3">
          <Gauge actual={actual} baseline={baseline} size={200} label="Realisasi keseluruhan" dark />
          <p className="mt-1 text-center text-[10px] text-blue-100">
            Busur = realisasi · garis = baseline
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
            {hasRkm ? 'Realisasi aktual RKM' : 'Rata-rata progres sub task'}
          </p>
          <h2 className="mt-1 text-[15px] font-extrabold leading-snug">
            {report.rkm?.title || 'Pengadaan Tanah untuk Mendukung Proyek Strategis'}
          </h2>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <span className="text-[40px] font-extrabold leading-none text-amber-300">{actual}%</span>
            <span className="pb-1 text-[12px] text-blue-50">dari target baseline {baseline}%</span>
            <span
              className={`mb-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                gap >= 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/25 text-red-100'
              }`}
            >
              {gap >= 0 ? '▲' : '▼'} {Math.abs(gap)}%
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
            <HeroStat label="Progres sub task" value={`${report.systemProgress}%`} />
            <HeroStat label="Rencana jadwal" value={`${report.plannedProgress}%`} />
            <HeroStat label="Tercapai" value={`${report.counts.DONE}/${report.counts.total}`} />
            <HeroStat label="Lewat target" value={String(report.overdueCount)} />
          </div>
          {!hasRkm && (
            <p className="mt-2 text-[10px] text-blue-100">
              Filter aktif tidak memiliki angka RKM; gauge memakai progres sub task vs rencana jadwal.
            </p>
          )}
        </div>

        <div className="space-y-2 text-[11px]">
          <HeroPill label="Status" value={report.rkm?.status || 'On Progress'} highlight />
          <HeroPill label="Tanggal mulai" value={formatDateId(report.periodStart)} />
          <HeroPill label="Tanggal selesai" value={formatDateId(report.periodEnd)} />
          <HeroPill label="Sisa waktu" value={`${report.daysToYearEnd} hari`} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/10 p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-blue-100">Ringkasan Eksekutif</p>
        <div className="mt-2 space-y-1.5 text-[11px] leading-5 text-blue-50">
          {report.executiveSummary.map(text => (
            <p key={text}>{text}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2">
      <p className="text-blue-100">{label}</p>
      <p className="mt-0.5 text-[14px] font-extrabold">{value}</p>
    </div>
  );
}

function HeroPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-full border border-white/25 px-4 py-1.5">
      <span className="text-blue-100">{label}</span>
      <b className={highlight ? 'rounded-full bg-emerald-500 px-2.5 py-0.5 text-white' : ''}>{value}</b>
    </div>
  );
}

function NarrativeList({
  title,
  items,
  tone,
  extra,
}: {
  title: string;
  items: { title: string; detail: string }[];
  tone: 'teal' | 'amber' | 'blue';
  extra?: { title: string; detail: string }[];
}) {
  const header =
    tone === 'teal' ? 'bg-teal-700' : tone === 'amber' ? 'bg-amber-600' : 'bg-blue-700';

  return (
    <div>
      <p className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-white ${header}`}>{title}</p>
      <ul className="mt-2 space-y-2 pl-1">
        {items.map(item => (
          <li key={item.title + item.detail} className="text-[10.5px] leading-[1.45] text-slate-600">
            <span className="font-bold text-[#0B2A63]">• {item.title}</span>
            <br />
            {item.detail}
          </li>
        ))}
        {extra?.map(item => (
          <li key={'x' + item.title} className="rounded-lg bg-amber-50 px-2 py-1.5 text-[10.5px] leading-[1.45] text-amber-800">
            <span className="font-bold">⚠ {item.title}</span>
            <br />
            {item.detail}
          </li>
        ))}
        {!items.length && !extra?.length && <li className="text-[10px] text-slate-400">Belum ada data.</li>}
      </ul>
    </div>
  );
}

function ProgramReportCard({ program }: { program: ProgramReport }) {
  const [section, setSection] = useState<'capaian' | 'isu' | 'next'>('capaian');
  const hasRkm = program.rkmActual !== null;

  return (
    <article className="flex flex-col rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="rounded-t-[24px] bg-gradient-to-r from-[#0A2F63] to-[#0B5AA8] px-4 py-3 text-white">
        <p className="text-[13px] font-extrabold leading-snug">{program.name}</p>
        <p className="mt-0.5 text-[10px] text-blue-100">
          ID: {program.code} · PIC: <b className="text-white">{program.pic}</b>
        </p>
      </div>

      <div className="grid grid-cols-[150px_1fr] items-center gap-3 border-b border-slate-100 p-4">
        <div>
          <Gauge
            actual={hasRkm ? program.rkmActual! : program.systemProgress}
            baseline={hasRkm ? program.rkmBaseline : program.plannedProgress}
            size={150}
          />
          <p className="text-center text-[10px] font-semibold text-slate-500">
            {hasRkm ? `Baseline ${program.rkmBaseline}%` : `Rencana ${program.plannedProgress}%`}
          </p>
        </div>
        <div className="space-y-2">
          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold ${CONDITION_STYLE[program.condition]}`}>
            {program.condition}
          </span>
          <div className="text-[10.5px] text-slate-600">
            <p>
              Progres sub task <b className="text-[#0B2A63]">{program.systemProgress}%</b>{' '}
              <span className="text-slate-400">(rencana {program.plannedProgress}%)</span>
            </p>
            <p>
              Ketercapaian <b className="text-emerald-700">{program.achievementRate}%</b> · {program.counts.DONE} dari{' '}
              {program.counts.total} sub task
            </p>
          </div>
          <StatusSplitBar counts={program.counts} />
        </div>
      </div>

      <div className="flex gap-1 px-4 pt-3">
        {(
          [
            ['capaian', 'Capaian'],
            ['isu', `Isu (${program.isu.length + program.systemIssues.length})`],
            ['next', 'Next Step'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${
              section === key ? 'bg-[#082C61] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-h-[300px] flex-1 overflow-y-auto p-4 pt-3">
        {section === 'capaian' && <NarrativeList title="CAPAIAN" items={program.capaian} tone="teal" />}
        {section === 'isu' && (
          <NarrativeList title="ISU" items={program.isu} extra={program.systemIssues} tone="amber" />
        )}
        {section === 'next' && <NarrativeList title="NEXT STEP" items={program.nextStep} tone="blue" />}
      </div>

      <div className="border-t border-slate-100 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Progres per task</p>
        <div className="space-y-2">
          {program.tasks.map(task => (
            <div key={task.name}>
              <div className="flex justify-between gap-2 text-[10px]">
                <span className="line-clamp-1 font-semibold text-slate-600" title={task.name}>
                  {task.name}
                </span>
                <span className="shrink-0 font-bold text-[#0B2A63]">
                  {task.progress}% · {task.done}/{task.total}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${task.progress === 100 ? 'bg-emerald-500' : task.progress === 0 ? 'bg-slate-300' : 'bg-blue-600'}`}
                  style={{ width: `${Math.max(task.progress, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function MeterRow({
  label,
  sublabel,
  done,
  total,
  avgPending,
  active,
  onClick,
}: {
  label: string;
  sublabel?: string;
  done: number;
  total: number;
  avgPending: number | null;
  active?: boolean;
  onClick?: () => void;
}) {
  const pending = total - done;
  const rate = total ? Math.round((done / total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
        active ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-1 text-[10.5px] font-bold text-[#0B2A63]" title={label}>
            {label}
          </p>
          {sublabel && <p className="line-clamp-1 text-[9px] text-slate-400">{sublabel}</p>}
        </div>
        <div className="shrink-0 text-right text-[9.5px]">
          <span className="font-bold text-emerald-700">{done} selesai</span>
          <span className="text-slate-300"> · </span>
          <span className={`font-bold ${pending ? 'text-amber-700' : 'text-slate-400'}`}>{pending} pending</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-amber-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
        </div>
        <span className="w-9 shrink-0 text-right text-[10px] font-extrabold text-[#0B2A63]">{rate}%</span>
      </div>
      {avgPending !== null && pending > 0 && (
        <p className="mt-1 text-[9px] text-slate-500">Rata-rata progres pending: {avgPending}%</p>
      )}
    </button>
  );
}

function AchievementPanel({
  report,
  tab,
  onTabChange,
  programId,
  taskName,
  onProgramChange,
  onTaskChange,
}: {
  report: OverallReport;
  tab: 'pending' | 'achieved';
  onTabChange: (tab: 'pending' | 'achieved') => void;
  programId: string;
  taskName: string;
  onProgramChange: (value: string) => void;
  onTaskChange: (value: string) => void;
}) {
  const programsInScope =
    programId === 'ALL' ? report.programs : report.programs.filter(program => program.id === programId);
  const scopeItems = programsInScope
    .flatMap(program => [...program.achieved, ...program.pending])
    .filter(item => taskName === 'ALL' || item.taskName === taskName);

  const achieved = scopeItems.filter(item => item.status === 'DONE');
  const pending = scopeItems
    .filter(item => item.status !== 'DONE')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.daysLeft - b.daysLeft);
  const rows: ReportItem[] = tab === 'achieved' ? achieved : pending;

  const counts = {
    DONE: achieved.length,
    WIP: pending.filter(item => item.status === 'WIP').length,
    NOT_STARTED: pending.filter(item => item.status === 'NOT_STARTED').length,
    DELAYED: pending.filter(item => item.status === 'DELAYED').length,
    total: scopeItems.length,
  };
  const rate = counts.total ? Math.round((counts.DONE / counts.total) * 100) : 0;
  const avg = (list: ReportItem[]) =>
    list.length ? Math.round(list.reduce((sum, item) => sum + item.progress, 0) / list.length) : null;
  const avgPending = avg(pending);
  const highPriority = pending.filter(item => item.priority === 'Tinggi').length;

  // Opsi task list mengikuti program terpilih.
  const taskOptions = programsInScope.flatMap(program =>
    program.tasks.map(task => ({ program: program.name, name: task.name })),
  );

  // Rincian meter: per program (bila semua program) atau per task (bila satu program dipilih).
  const breakdown =
    programId === 'ALL'
      ? report.programs.map(program => {
          const items = [...program.achieved, ...program.pending];
          return {
            key: program.id,
            label: program.name,
            sublabel: `PIC ${program.pic}`,
            done: program.achieved.length,
            total: items.length,
            avgPending: avg(program.pending),
            onClick: () => onProgramChange(program.id),
            active: false,
          };
        })
      : programsInScope.flatMap(program =>
          program.tasks.map(task => {
            const items = [...program.achieved, ...program.pending].filter(item => item.taskName === task.name);
            return {
              key: `${program.id}-${task.name}`,
              label: task.name,
              sublabel: task.type,
              done: items.filter(item => item.status === 'DONE').length,
              total: items.length,
              avgPending: avg(items.filter(item => item.status !== 'DONE')),
              onClick: () => onTaskChange(taskName === task.name ? 'ALL' : task.name),
              active: taskName === task.name,
            };
          }),
        );

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Capaian vs Pending</h3>
          <p className="text-[10px] text-slate-500">Apa yang sudah tercapai dan apa yang masih tertunda per sub task.</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onTabChange('achieved')}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${tab === 'achieved' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
          >
            Tercapai ({achieved.length})
          </button>
          <button
            type="button"
            onClick={() => onTabChange('pending')}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${tab === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}
          >
            Pending ({pending.length})
          </button>
        </div>
      </div>

      {/* FILTER */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wide text-slate-400">Program</span>
          <select
            value={programId}
            onChange={event => onProgramChange(event.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-[#0B2A63] outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Program</option>
            {report.programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wide text-slate-400">Task List</span>
          <select
            value={taskName}
            onChange={event => onTaskChange(event.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-[#0B2A63] outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Task List</option>
            {taskOptions.map(option => (
              <option key={`${option.program}-${option.name}`} value={option.name}>
                {programId === 'ALL' ? `${option.name} — ${option.program}` : option.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* METER */}
      <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-[150px_1fr]">
        <div>
          <Gauge actual={rate} baseline={null} size={150} label="Ketercapaian" />
          <p className="text-center text-[10px] font-bold text-slate-500">Ketercapaian sub task</p>
        </div>
        <div className="min-w-0 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white px-3 py-2">
              <p className="text-[9.5px] text-slate-500">Terselesaikan</p>
              <p className="text-[18px] font-extrabold text-emerald-700">{counts.DONE}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2">
              <p className="text-[9.5px] text-slate-500">Pending</p>
              <p className="text-[18px] font-extrabold text-amber-700">{pending.length}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2">
              <p className="text-[9.5px] text-slate-500">Prioritas tinggi</p>
              <p className={`text-[18px] font-extrabold ${highPriority ? 'text-red-600' : 'text-slate-400'}`}>{highPriority}</p>
            </div>
          </div>
          <StatusSplitBar counts={counts} />
          {avgPending !== null && (
            <p className="text-[10px] text-slate-500">
              Rata-rata progres pekerjaan pending: <b className="text-[#0B2A63]">{avgPending}%</b>
            </p>
          )}
        </div>
      </div>

      {/* RINCIAN METER */}
      {taskName === 'ALL' && (
        <div className="mt-3">
          <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
            {programId === 'ALL' ? 'Meter per program (klik untuk memfilter)' : 'Meter per task list (klik untuk memfilter)'}
          </p>
          <div className="grid max-h-[210px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 lg:grid-cols-2">
            {breakdown.map(({ key, ...item }) => (
              <MeterRow key={key} {...item} />
            ))}
          </div>
        </div>
      )}
      {taskName !== 'ALL' && (
        <button
          type="button"
          onClick={() => onTaskChange('ALL')}
          className="mt-2 text-[10px] font-bold text-blue-700 hover:underline"
        >
          ← Kembali ke semua task list
        </button>
      )}

      <div className="mt-3 max-h-[360px] overflow-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-100 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-2">Sub task</th>
              <th className="py-2 pr-2">PIC</th>
              {tab === 'pending' && <th className="py-2 pr-2">Status</th>}
              {tab === 'pending' && <th className="py-2 pr-2">Progres</th>}
              <th className="py-2 pr-2">Target</th>
              {tab === 'pending' && <th className="py-2">Prioritas</th>}
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[10.5px] text-slate-400">
                  {tab === 'pending' ? 'Tidak ada pekerjaan pending pada filter ini 🎉' : 'Belum ada sub task yang selesai pada filter ini.'}
                </td>
              </tr>
            )}
            {rows.map(item => (
              <tr key={item.id} className="border-b border-slate-50 align-top">
                <td className="py-2 pr-2">
                  <p className="text-[10.5px] font-bold leading-4 text-[#0B2A63]">{item.subTaskName}</p>
                  <p className="mt-0.5 text-[9.5px] text-slate-400">{item.taskName}</p>
                  {tab === 'pending' && item.waitingFor && (
                    <p className="mt-0.5 text-[9.5px] text-amber-700">Menunggu: {item.waitingFor}</p>
                  )}
                </td>
                <td className="py-2 pr-2 text-[10px] text-slate-600">{item.pic}</td>
                {tab === 'pending' && (
                  <td className="py-2 pr-2">
                    <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[9px] font-bold ${ITEM_STATUS_STYLE[item.status]}`}>
                      {item.statusLabel}
                    </span>
                  </td>
                )}
                {tab === 'pending' && (
                  <td className="py-2 pr-2">
                    <div className="w-[70px]">
                      <span className="text-[10px] font-bold text-[#0B2A63]">{item.progress}%</span>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  </td>
                )}
                <td className="whitespace-nowrap py-2 pr-2 text-[10px] text-slate-600">
                  {formatDateId(item.dueDate)}
                  {item.estimatedSchedule && <span title="Tanggal estimasi (rencana RKM)">*</span>}
                  {item.overdueDays > 0 && <p className="text-red-500">lewat {item.overdueDays} hari</p>}
                  {item.overdueDays === 0 && item.status !== 'DONE' && item.daysLeft <= 30 && (
                    <p className="text-amber-600">{item.daysLeft} hari lagi</p>
                  )}
                </td>
                {tab === 'pending' && (
                  <td className="py-2">
                    <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold ${PRIORITY_STYLE[item.priority]}`}>
                      {item.priority}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[9.5px] text-slate-400">* Tanggal masih memakai rencana periode RKM; koreksi melalui Master Data.</p>
    </article>
  );
}

function StrategicActionsPanel({ report, programId = 'ALL' }: { report: OverallReport; programId?: string }) {
  const programName = report.programs.find(program => program.id === programId)?.name;
  const actions = programName ? report.actions.filter(action => action.programName === programName) : report.actions;
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-[14px] font-extrabold text-[#0B2A63]">Isu & Langkah Strategis</h3>
      <p className="text-[10px] text-slate-500">
        {programName ? `Program: ${programName} · ` : ''}Dikelompokkan per kategori isu, diurutkan dari prioritas tertinggi.
      </p>

      <div className="mt-3 max-h-[760px] space-y-2 overflow-y-auto pr-1">
        {actions.map((action, index) => (
          <div key={action.programName + action.issue} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10.5px] font-bold leading-4 text-[#0B2A63]">
                {index + 1}. {action.issue.split(':')[0]}
              </p>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold ${PRIORITY_STYLE[action.priority]}`}>
                {action.priority}
              </span>
            </div>
            <p className="mt-0.5 text-[9.5px] text-slate-400">
              {action.programName} · PIC {action.pic} · target terdekat {action.target}
            </p>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-600">
              <b className="text-amber-700">Isu:</b> {action.issue.split(':').slice(1).join(':').trim()}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-slate-600">
              <b className="text-slate-700">Dampak:</b> {action.impact}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-slate-600">
              <b className="text-blue-700">Langkah:</b> {action.step}
            </p>
          </div>
        ))}
        {!actions.length && <p className="text-[10px] text-slate-400">Tidak ada isu terbuka pada filter aktif.</p>}
      </div>
    </article>
  );
}
