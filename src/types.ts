export interface SubTask {
  id: string;
  name: string;
  status: 'DONE' | 'WIP' | 'DELAYED';
  progress: number; // 0 - 100
  pic: string;
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  notes?: string;
}

export interface Task {
  id: string;
  name: string;
  type: 'RKM' | 'NON_RKM';
  subTasks: SubTask[];
}

export interface Program {
  id: string;
  name: string;
  tasks: Task[];
}

export interface DashboardStats {
  totalPrograms: number;
  totalTasks: number;
  totalSubTasks: number;
  overallProgress: number;
  overdueTasksCount: number;
  atRiskProgramsCount: number;
}

export interface PICProgress {
  pic: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}
