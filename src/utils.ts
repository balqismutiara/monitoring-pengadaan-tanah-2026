import { Program, DashboardStats, PICProgress, SubTaskStatus } from './types';

const pad = (value: number) => String(value).padStart(2, '0');

/** Tanggal (lokal) dalam format YYYY-MM-DD. */
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Tanggal acuan sistem = hari ini (zona waktu perangkat).
 * Sebelumnya dipatok ke 2026-06-19 sehingga status "terlambat" tidak sesuai kondisi riil.
 */
export const CURRENT_DATE_STR = toDateKey(new Date());

const DAY_MS = 1000 * 60 * 60 * 24;

export const STATUS_LABELS: Record<SubTaskStatus, string> = {
  DONE: 'Selesai',
  WIP: 'Proses',
  NOT_STARTED: 'Belum Mulai',
  DELAYED: 'Tertunda',
};

export function calculateSubTaskProgress(status: SubTaskStatus | string, progress: number): number {
  if (status === 'DONE') return 100;
  const value = Number(progress) || 0;
  return Math.min(100, Math.max(0, value));
}

export function isSubTaskOverdue(subTask: { status: string; dueDate: string }): boolean {
  if (subTask.status === 'DONE') return false;
  if (!subTask.dueDate) return false;
  return subTask.dueDate < CURRENT_DATE_STR;
}

/** Progres rencana linear berdasarkan tanggal mulai - target, pada tanggal acuan. */
export function plannedProgressAt(startDate: string, dueDate: string, asOf: string = CURRENT_DATE_STR): number {
  const start = new Date(startDate).getTime();
  const due = new Date(dueDate).getTime();
  const now = new Date(asOf).getTime();
  if (Number.isNaN(start) || Number.isNaN(due) || Number.isNaN(now)) return 0;
  if (now <= start) return 0;
  if (now >= due || due <= start) return 100;
  return Math.round(((now - start) / (due - start)) * 100);
}

export function daysBetween(fromDate: string, toDate: string) {
  return Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / DAY_MS);
}

type TaskStatus = 'DONE' | 'WIP' | 'NOT_STARTED' | 'DELAYED';

export function calculateTaskMetrics(task: {
  subTasks: { status: SubTaskStatus | string; progress: number; dueDate: string }[];
}) {
  if (task.subTasks.length === 0) {
    return { progress: 0, isOverdue: false, status: 'NOT_STARTED' as TaskStatus };
  }

  let totalProgress = 0;
  let hasDelayed = false;
  let hasOverdueSub = false;
  let allNotStarted = true;

  task.subTasks.forEach(sub => {
    totalProgress += calculateSubTaskProgress(sub.status, sub.progress);
    if (sub.status === 'DELAYED') hasDelayed = true;
    if (sub.status !== 'NOT_STARTED') allNotStarted = false;
    if (isSubTaskOverdue(sub)) hasOverdueSub = true;
  });

  const avgProgress = Math.round(totalProgress / task.subTasks.length);

  let status: TaskStatus = 'WIP';
  if (avgProgress === 100) status = 'DONE';
  else if (hasDelayed || hasOverdueSub) status = 'DELAYED';
  else if (allNotStarted) status = 'NOT_STARTED';

  return { progress: avgProgress, isOverdue: hasOverdueSub, status };
}

export function calculateProgramMetrics(program: Program) {
  if (program.tasks.length === 0) {
    return { progress: 0, status: 'WIP', isAtRisk: false, totalTasks: 0, delayedTasksCount: 0, overdueTasksCount: 0 };
  }

  let totalProgress = 0;
  let delayedTasksCount = 0;
  let overdueTasksCount = 0;

  program.tasks.forEach(task => {
    const metrics = calculateTaskMetrics(task);
    totalProgress += metrics.progress;
    if (metrics.status === 'DELAYED') delayedTasksCount++;
    if (metrics.isOverdue) overdueTasksCount++;
  });

  const avgProgress = Math.round(totalProgress / program.tasks.length);

  // Program "Berisiko" bila: ada task tertunda/terlambat, ATAU progres rata-rata < 35%,
  // ATAU progres RKM aktual berada di bawah baseline.
  const rkmBehind = program.rkm ? program.rkm.actual < program.rkm.baseline : false;
  const isAtRisk = delayedTasksCount > 0 || overdueTasksCount > 0 || avgProgress < 35 || rkmBehind;

  return {
    progress: avgProgress,
    delayedTasksCount,
    overdueTasksCount,
    isAtRisk,
    totalTasks: program.tasks.length,
  };
}

export function calculateDashboardStats(programs: Program[]): DashboardStats {
  const totalPrograms = programs.length;
  let totalTasks = 0;
  let totalSubTasks = 0;
  let totalProgSum = 0;
  let overdueTasksCount = 0;
  let atRiskProgramsCount = 0;

  programs.forEach(prog => {
    const progMetrics = calculateProgramMetrics(prog);
    totalProgSum += progMetrics.progress;
    if (progMetrics.isAtRisk) atRiskProgramsCount++;

    prog.tasks.forEach(task => {
      totalTasks++;
      const taskMetrics = calculateTaskMetrics(task);
      if (taskMetrics.isOverdue || taskMetrics.status === 'DELAYED') overdueTasksCount++;
      totalSubTasks += task.subTasks.length;
    });
  });

  const overallProgress = totalPrograms > 0 ? Math.round(totalProgSum / totalPrograms) : 0;

  return {
    totalPrograms,
    totalTasks,
    totalSubTasks,
    overallProgress,
    overdueTasksCount,
    atRiskProgramsCount,
  };
}

export function calculatePicProgress(programs: Program[]): PICProgress[] {
  const picMap: { [name: string]: { total: number; completed: number; progressSum: number } } = {};

  programs.forEach(prog => {
    prog.tasks.forEach(task => {
      task.subTasks.forEach(sub => {
        const pic = sub.pic || prog.pic || 'Unassigned';
        if (!picMap[pic]) picMap[pic] = { total: 0, completed: 0, progressSum: 0 };
        picMap[pic].total += 1;
        picMap[pic].progressSum += calculateSubTaskProgress(sub.status, sub.progress);
        if (sub.status === 'DONE') picMap[pic].completed += 1;
      });
    });
  });

  return Object.keys(picMap)
    .map(picName => {
      const data = picMap[picName];
      return {
        pic: picName,
        totalTasks: data.total,
        completedTasks: data.completed,
        progress: Math.round(data.progressSum / data.total),
      };
    })
    .sort((a, b) => b.progress - a.progress);
}

/** Ubah label Indonesia / kode apa pun menjadi kode status standar. */
export function toStatusCode(value?: string): SubTaskStatus {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'DONE' || text === 'SELESAI') return 'DONE';
  if (text === 'DELAYED' || text === 'TERTUNDA') return 'DELAYED';
  if (text === 'NOT_STARTED' || text === 'BELUM MULAI' || text === 'BELUM_MULAI') return 'NOT_STARTED';
  return 'WIP';
}

/** Label Bahasa Indonesia untuk kode status. */
export function statusLabel(value?: string): string {
  return STATUS_LABELS[toStatusCode(value)];
}

/**
 * Aturan konsistensi status & progres sub task:
 * - Selesai  -> progres 100
 * - progres 100 -> Selesai
 * - Belum Mulai dengan progres > 0 -> Proses
 * - Proses dengan progres 0 tetap Proses (sudah dimulai)
 */
export function normalizeSubTaskState<T extends { status?: string; progress?: number }>(subTask: T): T {
  const status = toStatusCode(subTask.status);
  const progress = Math.min(100, Math.max(0, Number(subTask.progress) || 0));
  if (status === 'DONE' || progress >= 100) return { ...subTask, status: 'DONE', progress: 100 };
  if (status === 'NOT_STARTED' && progress > 0) return { ...subTask, status: 'WIP', progress };
  return { ...subTask, status, progress };
}

export function normalizePrograms(programs: Program[]): Program[] {
  return programs.map(program => ({
    ...program,
    tasks: (program.tasks || []).map(task => ({
      ...task,
      subTasks: (task.subTasks || []).map(subTask => normalizeSubTaskState(subTask)),
    })),
  }));
}

/** Sub task dianggap selesai bila status Selesai atau progres 100%. */
export const isSubTaskDone = (subTask: { status?: string; progress?: number }) =>
  toStatusCode(subTask.status) === 'DONE' || Number(subTask.progress) >= 100;
