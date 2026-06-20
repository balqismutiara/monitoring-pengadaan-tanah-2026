import { Program, DashboardStats, PICProgress } from './types';

// The "current date" of the system simulation is 2026-06-19
export const CURRENT_DATE_STR = "2026-06-19";

export function calculateSubTaskProgress(status: 'DONE' | 'WIP' | 'DELAYED', progress: number): number {
  if (status === 'DONE') return 100;
  if (status === 'DELAYED') return progress > 0 ? progress : 0;
  return progress;
}

export function isSubTaskOverdue(subTask: { status: string; dueDate: string }): boolean {
  if (subTask.status === 'DONE') return false;
  return subTask.dueDate < CURRENT_DATE_STR;
}

export function calculateTaskMetrics(task: { subTasks: { status: 'DONE' | 'WIP' | 'DELAYED'; progress: number; dueDate: string }[] }) {
  if (task.subTasks.length === 0) return { progress: 0, isOverdue: false, status: 'WIP' as const };
  
  let totalProgress = 0;
  let hasDelayed = false;
  let hasOverdueSub = false;

  task.subTasks.forEach(sub => {
    const prog = calculateSubTaskProgress(sub.status, sub.progress);
    totalProgress += prog;
    if (sub.status === 'DELAYED') {
      hasDelayed = true;
    }
    if (isSubTaskOverdue(sub)) {
      hasOverdueSub = true;
    }
  });

  const avgProgress = Math.round(totalProgress / task.subTasks.length);
  
  let status: 'DONE' | 'WIP' | 'DELAYED' = 'WIP';
  if (avgProgress === 100) {
    status = 'DONE';
  } else if (hasDelayed || hasOverdueSub) {
    status = 'DELAYED';
  }

  return {
    progress: avgProgress,
    isOverdue: hasOverdueSub,
    status
  };
}

export function calculateProgramMetrics(program: Program) {
  if (program.tasks.length === 0) return { progress: 0, status: 'WIP', isAtRisk: false, totalTasks: 0 };

  let totalProgress = 0;
  let delayedTasksCount = 0;
  let overdueTasksCount = 0;

  program.tasks.forEach(task => {
    const metrics = calculateTaskMetrics(task);
    totalProgress += metrics.progress;
    if (metrics.status === 'DELAYED') {
      delayedTasksCount++;
    }
    if (metrics.isOverdue) {
      overdueTasksCount++;
    }
  });

  const avgProgress = Math.round(totalProgress / program.tasks.length);
  
  // Program is "At Risk" (Beresiko) if:
  // - It has any delayed task OR
  // - It has overdue subtasks OR
  // - average progress is less than 35%
  const isAtRisk = delayedTasksCount > 0 || overdueTasksCount > 0 || avgProgress < 35;

  return {
    progress: avgProgress,
    delayedTasksCount,
    overdueTasksCount,
    isAtRisk,
    totalTasks: program.tasks.length
  };
}

export function calculateDashboardStats(programs: Program[]): DashboardStats {
  let totalPrograms = programs.length;
  let totalTasks = 0;
  let totalSubTasks = 0;
  let totalProgSum = 0;
  let overdueTasksCount = 0;
  let atRiskProgramsCount = 0;

  programs.forEach(prog => {
    const progMetrics = calculateProgramMetrics(prog);
    totalProgSum += progMetrics.progress;
    
    if (progMetrics.isAtRisk) {
      atRiskProgramsCount++;
    }

    prog.tasks.forEach(task => {
      totalTasks++;
      const taskMetrics = calculateTaskMetrics(task);
      if (taskMetrics.isOverdue || taskMetrics.status === 'DELAYED') {
        overdueTasksCount++;
      }

      task.subTasks.forEach(sub => {
        totalSubTasks++;
      });
    });
  });

  const overallProgress = totalPrograms > 0 ? Math.round(totalProgSum / totalPrograms) : 0;

  return {
    totalPrograms,
    totalTasks,
    totalSubTasks,
    overallProgress,
    overdueTasksCount,
    atRiskProgramsCount
  };
}

export function calculatePicProgress(programs: Program[]): PICProgress[] {
  const picMap: { [name: string]: { total: number; completed: number; progressSum: number } } = {};

  programs.forEach(prog => {
    prog.tasks.forEach(task => {
      task.subTasks.forEach(sub => {
        const pic = sub.pic || "Unassigned";
        if (!picMap[pic]) {
          picMap[pic] = { total: 0, completed: 0, progressSum: 0 };
        }
        picMap[pic].total += 1;
        const progress = calculateSubTaskProgress(sub.status, sub.progress);
        picMap[pic].progressSum += progress;
        if (sub.status === 'DONE') {
          picMap[pic].completed += 1;
        }
      });
    });
  });

  return Object.keys(picMap).map(picName => {
    const data = picMap[picName];
    return {
      pic: picName,
      totalTasks: data.total,
      completedTasks: data.completed,
      progress: Math.round(data.progressSum / data.total)
    };
  }).sort((a, b) => b.progress - a.progress);
}
