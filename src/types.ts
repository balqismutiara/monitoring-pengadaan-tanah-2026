export interface Attachment {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'IMAGE' | 'ZIP' | 'OTHER';
  url: string;
  uploadedAt?: string;
}

/** DONE = Selesai, WIP = Proses, NOT_STARTED = Belum Mulai, DELAYED = Tertunda */
export type SubTaskStatus = 'DONE' | 'WIP' | 'NOT_STARTED' | 'DELAYED';

export interface SubTask {
  id: string;
  name: string;
  status: SubTaskStatus;
  progress: number; // 0 - 100
  pic: string;
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  notes?: string;
  /** true bila jadwal masih memakai tanggal rencana RKM (belum ada tanggal resmi). */
  estimatedSchedule?: boolean;
  attachments?: Attachment[];
}

export interface Task {
  id: string;
  name: string;
  type: 'RKM' | 'NON_RKM';
  stage?: string;
  stageCode?: string;
  taskCode?: string;
  description?: string;
  subTasks: SubTask[];
  attachments?: Attachment[];
}

/** Butir narasi laporan (Capaian / Isu / Next Step). */
export interface NarrativeItem {
  title: string;
  detail: string;
}

/** Angka progres program sesuai Laporan Bulanan RKM. */
export interface RkmProgress {
  actual: number;
  baseline: number;
  status: string;
}

export interface RkmSummary {
  title: string;
  unit: string;
  actual: number;
  baseline: number;
  status: string;
  startDate: string;
  endDate: string;
  source: string;
}

export interface Program {
  id: string;
  name: string;
  code?: string;
  pic?: string;
  startDate?: string;
  endDate?: string;
  rkm?: RkmProgress;
  capaian?: NarrativeItem[];
  isu?: NarrativeItem[];
  nextStep?: NarrativeItem[];
  stages?: Array<{ id: string; name: string; code: string; description?: string }>;
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
