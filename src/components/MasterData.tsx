import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface MasterDataProps {
  programs?: any[];
  setPrograms?: (value: any) => void;
}

type RowType = 'program' | 'task' | 'subtask';

interface MasterRow {
  id: string;
  rowType: RowType;
  programIndex: number;
  taskIndex: number;
  subTaskIndex: number;
  programId: string;
  taskId: string;
  subTaskId: string;
  programName: string;
  taskName: string;
  subTaskName: string;
  pic: string;
  status: string;
  progress: number;
  startDate: string;
  targetDate: string;
  priority: string;
  weight: number;
  budget: string;
  notes: string;
}

type ModalType = 'program' | 'task' | 'subtask' | 'edit' | null;

const ITEMS_PER_PAGE = 10;

const getText = (...values: any[]) => {
  const found = values.find(
    value =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== '',
  );

  return found === undefined || found === null ? '' : String(found);
};

const getNumber = (...values: any[]) => {
  const found = values.find(
    value =>
      value !== undefined &&
      value !== null &&
      value !== '' &&
      !Number.isNaN(Number(value)),
  );

  return found === undefined ? 0 : Number(found);
};

const normalizeStatus = (value?: string) => {
  const status = String(value || 'WIP').trim().toUpperCase();

  if (status === 'SELESAI') return 'DONE';
  if (status === 'TERTUNDA') return 'DELAYED';
  if (status === 'PROSES') return 'WIP';
  if (status === 'NOT_STARTED' || status === 'BELUM MULAI') {
    return 'NOT_STARTED';
  }

  return status || 'WIP';
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

const flattenPrograms = (programs: any[]): MasterRow[] => {
  const rows: MasterRow[] = [];

  programs.forEach((program, programIndex) => {
    const programName = getText(
      program?.name,
      program?.programName,
      program?.title,
      program?.namaProgram,
      `Program ${programIndex + 1}`,
    );

    const programId = getText(
      program?.id,
      program?.programId,
      `program-${programIndex}`,
    );

    const tasks = getProgramTasks(program);

    if (!Array.isArray(tasks) || tasks.length === 0) {
      rows.push({
        id: `program-${programId}`,
        rowType: 'program',
        programIndex,
        taskIndex: -1,
        subTaskIndex: -1,
        programId,
        taskId: '',
        subTaskId: '',
        programName,
        taskName: '-',
        subTaskName: '-',
        pic: '-',
        status: 'NOT_STARTED',
        progress: 0,
        startDate: '',
        targetDate: '',
        priority: '-',
        weight: 0,
        budget: '-',
        notes: '-',
      });

      return;
    }

    tasks.forEach((task: any, taskIndex: number) => {
      const taskName = getText(
        task?.name,
        task?.taskName,
        task?.title,
        task?.taskList,
        `Task ${taskIndex + 1}`,
      );

      const taskId = getText(
        task?.id,
        task?.taskId,
        `${programId}-task-${taskIndex}`,
      );

      const subTasks = getTaskSubTasks(task);

      if (!Array.isArray(subTasks) || subTasks.length === 0) {
        rows.push({
          id: `task-${programId}-${taskId}`,
          rowType: 'task',
          programIndex,
          taskIndex,
          subTaskIndex: -1,
          programId,
          taskId,
          subTaskId: '',
          programName,
          taskName,
          subTaskName: '-',
          pic: getText(task?.pic, task?.PIC, '-'),
          status: normalizeStatus(task?.status),
          progress: getNumber(task?.progress),
          startDate: getText(
            task?.startDate,
            task?.tglMulai,
            task?.start,
          ),
          targetDate: getText(
            task?.dueDate,
            task?.targetDate,
            task?.endDate,
            task?.tglTarget,
          ),
          priority: getText(
            task?.priority,
            task?.prioritas,
            task?.['Prioritas (Custom Header)'],
            '-',
          ),
          weight: getNumber(
            task?.weight,
            task?.bobot,
            task?.['Bobot % (Custom Header)'],
          ),
          budget: getText(
            task?.budget,
            task?.anggaran,
            task?.['Anggaran (Custom Header)'],
            '-',
          ),
          notes: getText(
            task?.notes,
            task?.hambatan,
            task?.keterangan,
            task?.['Hambatan / Keterangan'],
            '-',
          ),
        });

        return;
      }

      subTasks.forEach((subTask: any, subTaskIndex: number) => {
        const subTaskName = getText(
          subTask?.name,
          subTask?.subTaskName,
          subTask?.title,
          subTask?.subTask,
          `Sub Task ${subTaskIndex + 1}`,
        );

        const subTaskId = getText(
          subTask?.id,
          subTask?.subTaskId,
          `${taskId}-sub-${subTaskIndex}`,
        );

        rows.push({
          id: `${programId}-${taskId}-${subTaskId}-${subTaskIndex}`,
          rowType: 'subtask',
          programIndex,
          taskIndex,
          subTaskIndex,
          programId,
          taskId,
          subTaskId,
          programName,
          taskName,
          subTaskName,
          pic: getText(
            subTask?.pic,
            subTask?.PIC,
            subTask?.personInCharge,
            task?.pic,
            task?.PIC,
            '-',
          ),
          status: normalizeStatus(
            getText(subTask?.status, subTask?.state),
          ),
          progress: Math.min(
            100,
            Math.max(
              0,
              getNumber(
                subTask?.progress,
                subTask?.progressPercent,
              ),
            ),
          ),
          startDate: getText(
            subTask?.startDate,
            subTask?.tglMulai,
            subTask?.start,
          ),
          targetDate: getText(
            subTask?.dueDate,
            subTask?.targetDate,
            subTask?.endDate,
            subTask?.tglTarget,
          ),
          priority: getText(
            subTask?.priority,
            subTask?.prioritas,
            subTask?.['Prioritas (Custom Header)'],
            '-',
          ),
          weight: getNumber(
            subTask?.weight,
            subTask?.bobot,
            subTask?.['Bobot % (Custom Header)'],
          ),
          budget: getText(
            subTask?.budget,
            subTask?.anggaran,
            subTask?.['Anggaran (Custom Header)'],
            '-',
          ),
          notes: getText(
            subTask?.notes,
            subTask?.hambatan,
            subTask?.keterangan,
            subTask?.['Hambatan / Keterangan'],
            '-',
          ),
        });
      });
    });
  });

  return rows;
};

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const statusLabel = (status: string) => {
  if (status === 'DONE') return 'Selesai';
  if (status === 'DELAYED') return 'Tertunda';
  if (status === 'NOT_STARTED') return 'Belum Mulai';
  return 'Proses';
};

export function MasterData({
  programs = [],
  setPrograms,
}: MasterDataProps) {
  const [search, setSearch] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState('ALL');
  const [selectedSubTaskId, setSelectedSubTaskId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedRow, setSelectedRow] = useState<MasterRow | null>(
    null,
  );

  const [programForm, setProgramForm] = useState({
    name: '',
  });

  const [taskForm, setTaskForm] = useState({
    programId: '',
    name: '',
  });

  const [subTaskForm, setSubTaskForm] = useState({
    programId: '',
    taskId: '',
    name: '',
    pic: '',
    status: 'WIP',
    progress: 0,
    startDate: '',
    targetDate: '',
    priority: 'Low',
    weight: 10,
    budget: '',
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    programName: '',
    taskName: '',
    subTaskName: '',
    pic: '',
    status: 'WIP',
    progress: 0,
    startDate: '',
    targetDate: '',
    priority: 'Low',
    weight: 10,
    budget: '',
    notes: '',
  });

  const rows = useMemo(() => flattenPrograms(programs), [programs]);

  const totalProgram = programs.length;

  const totalTask = useMemo(
    () =>
      programs.reduce((total, program) => {
        const tasks = getProgramTasks(program);
        return total + (Array.isArray(tasks) ? tasks.length : 0);
      }, 0),
    [programs],
  );

  const uniqueSubTask = useMemo(() => {
    const names = rows
      .filter(row => row.rowType === 'subtask')
      .map(row => row.subTaskName.trim().toLowerCase())
      .filter(Boolean);

    return new Set(names).size;
  }, [rows]);

  const selectedProgram = useMemo(
    () =>
      programs.find(
        program =>
          getText(program?.id, program?.programId) ===
          selectedProgramId,
      ),
    [programs, selectedProgramId],
  );

  const taskOptions = useMemo(() => {
    if (!selectedProgram) return [];

    const tasks = getProgramTasks(selectedProgram);

    if (!Array.isArray(tasks)) return [];

    return tasks.map((task: any, index: number) => ({
      id: getText(
        task?.id,
        task?.taskId,
        `${selectedProgramId}-task-${index}`,
      ),
      name: getText(
        task?.name,
        task?.taskName,
        task?.title,
        `Task ${index + 1}`,
      ),
      raw: task,
    }));
  }, [selectedProgram, selectedProgramId]);

  const selectedTask = taskOptions.find(
    task => task.id === selectedTaskId,
  );

  const subTaskOptions = useMemo(() => {
    if (!selectedTask) return [];

    const subTasks = getTaskSubTasks(selectedTask.raw);

    if (!Array.isArray(subTasks)) return [];

    return subTasks.map((subTask: any, index: number) => ({
      id: getText(
        subTask?.id,
        subTask?.subTaskId,
        `${selectedTaskId}-sub-${index}`,
      ),
      name: getText(
        subTask?.name,
        subTask?.subTaskName,
        subTask?.title,
        `Sub Task ${index + 1}`,
      ),
    }));
  }, [selectedTask, selectedTaskId]);

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map(row => row.status)
            .filter(Boolean),
        ),
      ).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter(row => {
      const matchProgram =
        selectedProgramId === 'ALL' ||
        row.programId === selectedProgramId;

      const matchTask =
        selectedTaskId === 'ALL' ||
        row.taskId === selectedTaskId;

      const matchSubTask =
        selectedSubTaskId === 'ALL' ||
        row.subTaskId === selectedSubTaskId;

      const matchStatus =
        selectedStatus === 'ALL' ||
        row.status === selectedStatus;

      const searchable = [
        row.programName,
        row.taskName,
        row.subTaskName,
        row.pic,
        row.status,
        row.priority,
        row.budget,
        row.notes,
      ]
        .join(' ')
        .toLowerCase();

      const matchSearch =
        !keyword || searchable.includes(keyword);

      return (
        matchProgram &&
        matchTask &&
        matchSubTask &&
        matchStatus &&
        matchSearch
      );
    });
  }, [
    rows,
    search,
    selectedProgramId,
    selectedTaskId,
    selectedSubTaskId,
    selectedStatus,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / ITEMS_PER_PAGE),
  );

  const safePage = Math.min(page, totalPages);

  const visibleRows = filteredRows.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const resetFilters = () => {
    setSearch('');
    setSelectedProgramId('ALL');
    setSelectedTaskId('ALL');
    setSelectedSubTaskId('ALL');
    setSelectedStatus('ALL');
    setPage(1);
  };

  const commitPrograms = (nextPrograms: any[]) => {
    if (setPrograms) {
      setPrograms(nextPrograms);
    }
  };

  const openAddProgram = () => {
    setProgramForm({ name: '' });
    setModal('program');
  };

  const openAddTask = () => {
    const initialProgramId =
      selectedProgramId !== 'ALL'
        ? selectedProgramId
        : getText(programs?.[0]?.id, programs?.[0]?.programId);

    setTaskForm({
      programId: initialProgramId,
      name: '',
    });

    setModal('task');
  };

  const openAddSubTask = () => {
    const initialProgramId =
      selectedProgramId !== 'ALL'
        ? selectedProgramId
        : getText(programs?.[0]?.id, programs?.[0]?.programId);

    const initialProgram = programs.find(
      program =>
        getText(program?.id, program?.programId) ===
        initialProgramId,
    );

    const initialTasks = getProgramTasks(initialProgram);
    const firstTask = Array.isArray(initialTasks)
      ? initialTasks[0]
      : undefined;

    const initialTaskId =
      selectedTaskId !== 'ALL'
        ? selectedTaskId
        : getText(firstTask?.id, firstTask?.taskId);

    setSubTaskForm({
      programId: initialProgramId,
      taskId: initialTaskId,
      name: '',
      pic: '',
      status: 'WIP',
      progress: 0,
      startDate: '',
      targetDate: '',
      priority: 'Low',
      weight: 10,
      budget: '',
      notes: '',
    });

    setModal('subtask');
  };

  const openEdit = (row: MasterRow) => {
    setSelectedRow(row);

    setEditForm({
      programName: row.programName === '-' ? '' : row.programName,
      taskName: row.taskName === '-' ? '' : row.taskName,
      subTaskName:
        row.subTaskName === '-' ? '' : row.subTaskName,
      pic: row.pic === '-' ? '' : row.pic,
      status: row.status,
      progress: row.progress,
      startDate: row.startDate,
      targetDate: row.targetDate,
      priority:
        row.priority === '-' ? 'Low' : row.priority,
      weight: row.weight,
      budget: row.budget === '-' ? '' : row.budget,
      notes: row.notes === '-' ? '' : row.notes,
    });

    setModal('edit');
  };

  const addProgram = () => {
    const name = programForm.name.trim();

    if (!name) return;

    commitPrograms([
      ...programs,
      {
        id: makeId('program'),
        name,
        tasks: [],
      },
    ]);

    setModal(null);
  };

  const addTask = () => {
    const name = taskForm.name.trim();

    if (!name || !taskForm.programId) return;

    const nextPrograms = programs.map(program => {
      const programId = getText(
        program?.id,
        program?.programId,
      );

      if (programId !== taskForm.programId) {
        return program;
      }

      const currentTasks = getProgramTasks(program);

      return {
        ...program,
        tasks: [
          ...(Array.isArray(currentTasks) ? currentTasks : []),
          {
            id: makeId('task'),
            name,
            subTasks: [],
          },
        ],
      };
    });

    commitPrograms(nextPrograms);
    setModal(null);
  };

  const addSubTask = () => {
    const name = subTaskForm.name.trim();

    if (
      !name ||
      !subTaskForm.programId ||
      !subTaskForm.taskId
    ) {
      return;
    }

    const nextPrograms = programs.map(program => {
      const programId = getText(
        program?.id,
        program?.programId,
      );

      if (programId !== subTaskForm.programId) {
        return program;
      }

      const tasks = getProgramTasks(program);

      return {
        ...program,
        tasks: (Array.isArray(tasks) ? tasks : []).map(
          (task: any, taskIndex: number) => {
            const taskId = getText(
              task?.id,
              task?.taskId,
              `${programId}-task-${taskIndex}`,
            );

            if (taskId !== subTaskForm.taskId) {
              return task;
            }

            const subTasks = getTaskSubTasks(task);

            return {
              ...task,
              subTasks: [
                ...(Array.isArray(subTasks) ? subTasks : []),
                {
                  id: makeId('subtask'),
                  name,
                  pic: subTaskForm.pic.trim() || '-',
                  status: subTaskForm.status,
                  progress: Number(subTaskForm.progress) || 0,
                  startDate: subTaskForm.startDate,
                  dueDate: subTaskForm.targetDate,
                  priority: subTaskForm.priority,
                  weight: Number(subTaskForm.weight) || 0,
                  budget: subTaskForm.budget,
                  notes: subTaskForm.notes,
                },
              ],
            };
          },
        ),
      };
    });

    commitPrograms(nextPrograms);
    setModal(null);
  };

  const saveEdit = () => {
    if (!selectedRow) return;

    const nextPrograms = programs.map(
      (program, programIndex) => {
        if (programIndex !== selectedRow.programIndex) {
          return program;
        }

        const nextProgram = {
          ...program,
          name: editForm.programName.trim() || rowFallbackName(program),
        };

        if (selectedRow.taskIndex < 0) {
          return nextProgram;
        }

        const tasks = getProgramTasks(program);

        nextProgram.tasks = (Array.isArray(tasks) ? tasks : []).map(
          (task: any, taskIndex: number) => {
            if (taskIndex !== selectedRow.taskIndex) {
              return task;
            }

            const nextTask = {
              ...task,
              name:
                editForm.taskName.trim() ||
                getText(task?.name, task?.taskName, task?.title),
            };

            if (selectedRow.subTaskIndex < 0) {
              return {
                ...nextTask,
                pic: editForm.pic,
                status: editForm.status,
                progress: Number(editForm.progress) || 0,
                startDate: editForm.startDate,
                dueDate: editForm.targetDate,
                priority: editForm.priority,
                weight: Number(editForm.weight) || 0,
                budget: editForm.budget,
                notes: editForm.notes,
              };
            }

            const subTasks = getTaskSubTasks(task);

            nextTask.subTasks = (
              Array.isArray(subTasks) ? subTasks : []
            ).map((subTask: any, subTaskIndex: number) => {
              if (
                subTaskIndex !== selectedRow.subTaskIndex
              ) {
                return subTask;
              }

              return {
                ...subTask,
                name:
                  editForm.subTaskName.trim() ||
                  getText(
                    subTask?.name,
                    subTask?.subTaskName,
                    subTask?.title,
                  ),
                pic: editForm.pic,
                status: editForm.status,
                progress: Math.min(
                  100,
                  Math.max(
                    0,
                    Number(editForm.progress) || 0,
                  ),
                ),
                startDate: editForm.startDate,
                dueDate: editForm.targetDate,
                targetDate: editForm.targetDate,
                priority: editForm.priority,
                weight: Number(editForm.weight) || 0,
                budget: editForm.budget,
                notes: editForm.notes,
              };
            });

            return nextTask;
          },
        );

        return nextProgram;
      },
    );

    commitPrograms(nextPrograms);
    setModal(null);
    setSelectedRow(null);
  };

  const exportExcel = () => {
    const exportRows = filteredRows.map(row => ({
      'Program Kerja': row.programName,
      'Task List (RKM/Non)':
        row.taskName === '-' ? '' : row.taskName,
      'Sub Task':
        row.subTaskName === '-' ? '' : row.subTaskName,
      'PIC (PJ)': row.pic === '-' ? '' : row.pic,
      Status: statusLabel(row.status),
      'Progress %': row.progress,
      'Tgl Mulai': row.startDate,
      'Tgl Target': row.targetDate,
      'Prioritas (Custom Header)':
        row.priority === '-' ? '' : row.priority,
      'Bobot % (Custom Header)': row.weight,
      'Anggaran (Custom Header)':
        row.budget === '-' ? '' : row.budget,
      'Hambatan / Keterangan':
        row.notes === '-' ? '' : row.notes,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Monitoring Lahan 2026',
    );

    XLSX.writeFile(
      workbook,
      'Master_Data_Monitoring_Pengadaan_Tanah_2026.xlsx',
    );
  };

  const modalProgramTasks = useMemo(() => {
    const targetProgramId =
      modal === 'subtask'
        ? subTaskForm.programId
        : taskForm.programId;

    const targetProgram = programs.find(
      program =>
        getText(program?.id, program?.programId) ===
        targetProgramId,
    );

    const tasks = getProgramTasks(targetProgram);

    if (!Array.isArray(tasks)) return [];

    return tasks.map((task: any, index: number) => ({
      id: getText(
        task?.id,
        task?.taskId,
        `${targetProgramId}-task-${index}`,
      ),
      name: getText(
        task?.name,
        task?.taskName,
        task?.title,
        `Task ${index + 1}`,
      ),
    }));
  }, [
    programs,
    modal,
    subTaskForm.programId,
    taskForm.programId,
  ]);

  return (
    <>
      <div className="space-y-5 text-[#102448]">
        {/* FILTER & ACTION */}
        <section className="rounded-[18px] border border-[#e0e7f0] bg-white p-4 shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
          <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[1.25fr_.85fr_.85fr_.85fr_.75fr_auto] 2xl:items-end">
            <div>
              <label className="mb-2 block text-[10px] font-semibold text-[#405a79]">
                Pencarian
              </label>

              <div className="flex h-[42px] items-center rounded-xl border border-[#dce4ef] bg-white px-3.5 transition focus-within:border-[#1666c5] focus-within:ring-2 focus-within:ring-[#1666c5]/10">
                <Search
                  size={16}
                  className="mr-2.5 shrink-0 text-[#7890ad]"
                />

                <input
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari program, task list, sub task, PIC..."
                  className="w-full bg-transparent text-[11px] text-[#233b62] outline-none placeholder:text-[#9aa9bc]"
                />
              </div>
            </div>

            <MasterSelect
              label="Program"
              value={selectedProgramId}
              onChange={value => {
                setSelectedProgramId(value);
                setSelectedTaskId('ALL');
                setSelectedSubTaskId('ALL');
                setPage(1);
              }}
              options={[
                {
                  value: 'ALL',
                  label: 'Semua Program',
                },
                ...programs.map(
                  (program, index) => ({
                    value: getText(
                      program?.id,
                      program?.programId,
                      `program-${index}`,
                    ),
                    label: getText(
                      program?.name,
                      program?.programName,
                      program?.title,
                      `Program ${index + 1}`,
                    ),
                  }),
                ),
              ]}
            />

            <MasterSelect
              label="Task List"
              value={selectedTaskId}
              onChange={value => {
                setSelectedTaskId(value);
                setSelectedSubTaskId('ALL');
                setPage(1);
              }}
              disabled={selectedProgramId === 'ALL'}
              options={[
                {
                  value: 'ALL',
                  label:
                    selectedProgramId === 'ALL'
                      ? 'Pilih Program'
                      : 'Semua Task List',
                },
                ...taskOptions.map(task => ({
                  value: task.id,
                  label: task.name,
                })),
              ]}
            />

            <MasterSelect
              label="Sub Task List"
              value={selectedSubTaskId}
              onChange={value => {
                setSelectedSubTaskId(value);
                setPage(1);
              }}
              disabled={
                selectedProgramId === 'ALL' ||
                selectedTaskId === 'ALL'
              }
              options={[
                {
                  value: 'ALL',
                  label:
                    selectedTaskId === 'ALL'
                      ? 'Pilih Task List'
                      : 'Semua Sub Task List',
                },
                ...subTaskOptions.map(subTask => ({
                  value: subTask.id,
                  label: subTask.name,
                })),
              ]}
            />

            <MasterSelect
              label="Status"
              value={selectedStatus}
              onChange={value => {
                setSelectedStatus(value);
                setPage(1);
              }}
              options={[
                {
                  value: 'ALL',
                  label: 'Semua Status',
                },
                ...statusOptions.map(status => ({
                  value: status,
                  label: statusLabel(status),
                })),
              ]}
            />

            <div className="flex flex-wrap justify-start gap-2 2xl:justify-end">
              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#d7e0ec] bg-white px-3.5 text-[10px] font-semibold text-[#203859] transition hover:bg-slate-50"
              >
                <Download size={14} />
                Download / Export
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="grid h-[42px] w-[42px] place-items-center rounded-xl border border-[#d7e0ec] bg-white text-[#607590] transition hover:bg-slate-50"
                title="Reset filter"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-medium text-slate-500">
              <span>
                <strong className="text-[#18365f]">
                  {totalProgram}
                </strong>{' '}
                Program
              </span>

              <span className="h-1 w-1 rounded-full bg-blue-500" />

              <span>
                <strong className="text-[#18365f]">
                  {totalTask}
                </strong>{' '}
                Task List
              </span>

              <span className="h-1 w-1 rounded-full bg-blue-500" />

              <span>
                <strong className="text-[#18365f]">
                  {uniqueSubTask}
                </strong>{' '}
                Unique Sub Task
              </span>

              <span className="h-1 w-1 rounded-full bg-blue-500" />

              <span>
                <strong className="text-[#18365f]">
                  {rows.filter(row => row.rowType === 'subtask').length}
                </strong>{' '}
                Baris Pekerjaan
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={openAddProgram}>
                <Plus size={14} />
                Tambah Program
              </PrimaryButton>

              <PrimaryButton onClick={openAddTask}>
                <Plus size={14} />
                Tambah Task List
              </PrimaryButton>

              <PrimaryButton onClick={openAddSubTask}>
                <Plus size={14} />
                Tambah Sub Task List
              </PrimaryButton>
            </div>
          </div>
        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-[18px] border border-[#e0e7f0] bg-white shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1510px] border-collapse">
              <thead>
                <tr className="border-b border-[#e9eef5] bg-[#fbfcfe]">
                  <TableHeader>PROGRAM</TableHeader>
                  <TableHeader>TASK LIST</TableHeader>
                  <TableHeader>SUB TASK LIST</TableHeader>
                  <TableHeader>PIC / PJ</TableHeader>
                  <TableHeader>STATUS</TableHeader>
                  <TableHeader>PROGRESS</TableHeader>
                  <TableHeader>TGL MULAI</TableHeader>
                  <TableHeader>TGL TARGET</TableHeader>
                  <TableHeader>PRIORITAS</TableHeader>
                  <TableHeader>BOBOT %</TableHeader>
                  <TableHeader>ANGGARAN</TableHeader>
                  <TableHeader>HAMBATAN / KETERANGAN</TableHeader>
                  <TableHeader>AKSI</TableHeader>
                </tr>
              </thead>

              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-6 py-16 text-center"
                    >
                      <Search
                        size={28}
                        className="mx-auto text-slate-300"
                      />
                      <p className="mt-3 text-sm font-bold text-slate-600">
                        Data tidak ditemukan
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Ubah filter atau kata pencarian untuk
                        menemukan data lain.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleRows.map(row => (
                    <tr
                      key={row.id}
                      className="border-b border-[#edf1f6] transition last:border-b-0 hover:bg-[#fafcff]"
                    >
                      <TableCell>
                        <div className="max-w-[150px] font-semibold leading-[1.45] text-[#142b4d]">
                          {row.programName}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[190px] leading-[1.45]">
                          {row.taskName}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[190px] leading-[1.45]">
                          {row.subTaskName}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[110px]">
                          {row.pic}
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>

                      <TableCell>
                        <ProgressCell progress={row.progress} />
                      </TableCell>

                      <TableCell>
                        <span className="whitespace-nowrap">
                          {row.startDate || '-'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="whitespace-nowrap">
                          {row.targetDate || '-'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <PriorityBadge priority={row.priority} />
                      </TableCell>

                      <TableCell>
                        {row.weight || '-'}
                      </TableCell>

                      <TableCell>
                        <span className="whitespace-nowrap">
                          {row.budget}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div
                          className="max-w-[180px] truncate"
                          title={row.notes}
                        >
                          {row.notes}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ee] bg-white text-[#0865c8] transition hover:bg-blue-50"
                            title="Edit data"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ee] bg-white text-[#506884] transition hover:bg-slate-50"
                            title="Opsi data"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col gap-4 border-t border-[#e7edf4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-[#7589a4]">
              Menampilkan{' '}
              {filteredRows.length === 0
                ? 0
                : (safePage - 1) * ITEMS_PER_PAGE + 1}{' '}
              -{' '}
              {Math.min(
                safePage * ITEMS_PER_PAGE,
                filteredRows.length,
              )}{' '}
              dari {filteredRows.length} data
            </p>

            <div className="flex items-center gap-2">
              <span className="mr-2 text-[9px] text-slate-400">
                10 / halaman
              </span>

              <PaginationButton
                disabled={safePage === 1}
                onClick={() =>
                  setPage(Math.max(1, safePage - 1))
                }
              >
                <ChevronLeft size={14} />
              </PaginationButton>

              <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-blue-600 px-2 text-[10px] font-bold text-white">
                {safePage}
              </span>

              <PaginationButton
                disabled={safePage === totalPages}
                onClick={() =>
                  setPage(
                    Math.min(totalPages, safePage + 1),
                  )
                }
              >
                <ChevronRight size={14} />
              </PaginationButton>
            </div>
          </footer>
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50/55 px-4 py-3">
          <p className="text-[9px] leading-4 text-blue-700">
            <strong>Informasi:</strong> Master Data menjadi
            tempat utama untuk menambah dan mengubah Program,
            Task List, dan Sub Task List. Pada tahap frontend,
            perubahan tersimpan pada state aplikasi selama sesi
            berjalan. Penyimpanan permanen akan dipindahkan ke
            backend MySQL pada tahap berikutnya.
          </p>
        </section>
      </div>

      {modal && (
        <ModalShell
          title={
            modal === 'program'
              ? 'Tambah Program'
              : modal === 'task'
                ? 'Tambah Task List'
                : modal === 'subtask'
                  ? 'Tambah Sub Task List'
                  : 'Edit Master Data'
          }
          subtitle={
            modal === 'edit'
              ? 'Perbarui informasi pada baris data yang dipilih.'
              : 'Isi data yang diperlukan lalu simpan perubahan.'
          }
          onClose={() => {
            setModal(null);
            setSelectedRow(null);
          }}
        >
          {modal === 'program' && (
            <>
              <FormField label="Nama Program">
                <input
                  value={programForm.name}
                  onChange={event =>
                    setProgramForm({
                      name: event.target.value,
                    })
                  }
                  placeholder="Contoh: Pengadaan Tanah Terminal Kijing"
                  className={inputClass}
                />
              </FormField>

              <ModalFooter
                onCancel={() => setModal(null)}
                onSave={addProgram}
                saveLabel="Tambah Program"
              />
            </>
          )}

          {modal === 'task' && (
            <>
              <FormField label="Program">
                <select
                  value={taskForm.programId}
                  onChange={event =>
                    setTaskForm(previous => ({
                      ...previous,
                      programId: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Pilih Program</option>
                  {programs.map((program, index) => (
                    <option
                      key={getText(
                        program?.id,
                        `program-${index}`,
                      )}
                      value={getText(
                        program?.id,
                        program?.programId,
                        `program-${index}`,
                      )}
                    >
                      {getText(
                        program?.name,
                        program?.programName,
                        program?.title,
                      )}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Nama Task List">
                <input
                  value={taskForm.name}
                  onChange={event =>
                    setTaskForm(previous => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Masukkan nama Task List"
                  className={inputClass}
                />
              </FormField>

              <ModalFooter
                onCancel={() => setModal(null)}
                onSave={addTask}
                saveLabel="Tambah Task List"
              />
            </>
          )}

          {modal === 'subtask' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Program">
                  <select
                    value={subTaskForm.programId}
                    onChange={event => {
                      const programId = event.target.value;
                      const program = programs.find(
                        item =>
                          getText(
                            item?.id,
                            item?.programId,
                          ) === programId,
                      );

                      const tasks = getProgramTasks(program);
                      const firstTask = Array.isArray(tasks)
                        ? tasks[0]
                        : undefined;

                      setSubTaskForm(previous => ({
                        ...previous,
                        programId,
                        taskId: getText(
                          firstTask?.id,
                          firstTask?.taskId,
                        ),
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="">Pilih Program</option>
                    {programs.map((program, index) => (
                      <option
                        key={getText(
                          program?.id,
                          `program-${index}`,
                        )}
                        value={getText(
                          program?.id,
                          program?.programId,
                          `program-${index}`,
                        )}
                      >
                        {getText(
                          program?.name,
                          program?.programName,
                          program?.title,
                        )}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Task List">
                  <select
                    value={subTaskForm.taskId}
                    onChange={event =>
                      setSubTaskForm(previous => ({
                        ...previous,
                        taskId: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Pilih Task List</option>
                    {modalProgramTasks.map(task => (
                      <option
                        key={task.id}
                        value={task.id}
                      >
                        {task.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Nama Sub Task List">
                <input
                  value={subTaskForm.name}
                  onChange={event =>
                    setSubTaskForm(previous => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Masukkan nama Sub Task"
                  className={inputClass}
                />
              </FormField>

              <SubTaskFields
                value={subTaskForm}
                onChange={setSubTaskForm}
              />

              <ModalFooter
                onCancel={() => setModal(null)}
                onSave={addSubTask}
                saveLabel="Tambah Sub Task"
              />
            </>
          )}

          {modal === 'edit' && selectedRow && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Program">
                  <input
                    value={editForm.programName}
                    onChange={event =>
                      setEditForm(previous => ({
                        ...previous,
                        programName: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Task List">
                  <input
                    value={editForm.taskName}
                    disabled={selectedRow.taskIndex < 0}
                    onChange={event =>
                      setEditForm(previous => ({
                        ...previous,
                        taskName: event.target.value,
                      }))
                    }
                    className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                  />
                </FormField>
              </div>

              <FormField label="Sub Task List">
                <input
                  value={editForm.subTaskName}
                  disabled={selectedRow.subTaskIndex < 0}
                  onChange={event =>
                    setEditForm(previous => ({
                      ...previous,
                      subTaskName: event.target.value,
                    }))
                  }
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                />
              </FormField>

              {selectedRow.taskIndex >= 0 && (
                <SubTaskFields
                  value={editForm}
                  onChange={setEditForm}
                />
              )}

              <ModalFooter
                onCancel={() => {
                  setModal(null);
                  setSelectedRow(null);
                }}
                onSave={saveEdit}
                saveLabel="Simpan Perubahan"
              />
            </>
          )}
        </ModalShell>
      )}
    </>
  );
}

const rowFallbackName = (program: any) =>
  getText(
    program?.name,
    program?.programName,
    program?.title,
    'Program',
  );

const inputClass =
  'h-[42px] w-full rounded-xl border border-[#dce4ef] bg-white px-3 text-[11px] text-[#233b62] outline-none transition placeholder:text-[#9aa9bc] focus:border-[#1666c5] focus:ring-2 focus:ring-[#1666c5]/10';

function MasterSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold text-[#405a79]">
        {label}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
      >
        {options.map(option => (
          <option
            key={`${label}-${option.value}`}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0868df] px-3.5 text-[9px] font-semibold text-white shadow-sm transition hover:bg-[#075ec8]"
    >
      {children}
    </button>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-3 py-3 text-left text-[7.5px] font-bold uppercase tracking-[0.04em] text-[#71839c]">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-3 py-3 text-[9.5px] text-[#5d708b]">
      {children}
    </td>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === 'DONE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        SELESAI
      </span>
    );
  }

  if (status === 'DELAYED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[8px] font-bold text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        TERTUNDA
      </span>
    );
  }

  if (status === 'NOT_STARTED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-bold text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        BELUM MULAI
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      PROSES
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  const value = String(priority || '-').toLowerCase();

  if (value === 'high' || value === 'tinggi') {
    return (
      <span className="rounded-md bg-red-50 px-2 py-1 text-[8px] font-semibold text-red-600">
        High
      </span>
    );
  }

  if (value === 'medium' || value === 'sedang') {
    return (
      <span className="rounded-md bg-amber-50 px-2 py-1 text-[8px] font-semibold text-amber-700">
        Medium
      </span>
    );
  }

  if (value === 'low' || value === 'rendah') {
    return (
      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700">
        Low
      </span>
    );
  }

  return <span>{priority}</span>;
}

function ProgressCell({
  progress,
}: {
  progress: number;
}) {
  const value = Math.min(
    100,
    Math.max(0, Number(progress) || 0),
  );

  const barClass =
    value >= 100
      ? 'bg-emerald-500'
      : value >= 50
        ? 'bg-blue-600'
        : value > 0
          ? 'bg-amber-500'
          : 'bg-slate-300';

  return (
    <div className="w-[90px]">
      <span className="text-[8px] font-semibold text-[#365170]">
        {value}%
      </span>

      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PaginationButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#102448]">
              {title}
            </h3>

            <p className="mt-1 text-[10px] text-slate-400">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4 p-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold text-[#405a79]">
        {label}
      </label>

      {children}
    </div>
  );
}

function SubTaskFields({
  value,
  onChange,
}: {
  value: any;
  onChange: React.Dispatch<React.SetStateAction<any>>;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="PIC / PJ">
          <input
            value={value.pic}
            onChange={event =>
              onChange((previous: any) => ({
                ...previous,
                pic: event.target.value,
              }))
            }
            placeholder="Nama PIC"
            className={inputClass}
          />
        </FormField>

        <FormField label="Status">
          <select
            value={value.status}
            onChange={event =>
              onChange((previous: any) => ({
                ...previous,
                status: event.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="NOT_STARTED">Belum Mulai</option>
            <option value="WIP">Proses</option>
            <option value="DONE">Selesai</option>
            <option value="DELAYED">Tertunda</option>
          </select>
        </FormField>

        <FormField label="Progress (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={value.progress}
            onChange={event =>
              onChange((previous: any) => ({
                ...previous,
                progress: Number(event.target.value),
              }))
            }
            className={inputClass}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Tanggal Mulai">
          <input
            type="date"
            value={value.startDate}
            onChange={event =>
              onChange((previous: any) => ({
                ...previous,
                startDate: event.target.value,
              }))
            }
            className={inputClass}
          />
        </FormField>

        <FormField label="Tanggal Target">
          <input
            type="date"
            value={value.targetDate}
            onChange={event =>
              onChange((previous: any) => ({
                ...previous,
                targetDate: event.target.value,
              }))
            }
            className={inputClass}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Prioritas">
          <select
            value={value.priority}
            onChange={event =>
              onChange((previous: any) => ({
                ...previous,
                priority: event.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </FormField>

        <FormField label="Bobot (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={value.weight}
            onChange={event =>
              onChange((previous: any) => ({
                ...previous,
                weight: Number(event.target.value),
              }))
            }
            className={inputClass}
          />
        </FormField>

        <FormField label="Anggaran">
          <input
            value={value.budget}
            onChange={event =>
              onChange((previous: any) => ({
                ...previous,
                budget: event.target.value,
              }))
            }
            placeholder="Contoh: Rp 250 Jt"
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField label="Hambatan / Keterangan">
        <textarea
          value={value.notes}
          onChange={event =>
            onChange((previous: any) => ({
              ...previous,
              notes: event.target.value,
            }))
          }
          rows={3}
          placeholder="Masukkan hambatan atau keterangan..."
          className="w-full resize-none rounded-xl border border-[#dce4ef] bg-white px-3 py-2.5 text-[11px] text-[#233b62] outline-none transition placeholder:text-[#9aa9bc] focus:border-[#1666c5] focus:ring-2 focus:ring-[#1666c5]/10"
        />
      </FormField>
    </>
  );
}

function ModalFooter({
  onCancel,
  onSave,
  saveLabel,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        Batal
      </button>

      <button
        type="button"
        onClick={onSave}
        className="h-9 rounded-lg bg-blue-600 px-4 text-[10px] font-semibold text-white transition hover:bg-blue-700"
      >
        {saveLabel}
      </button>
    </div>
  );
}

export default MasterData;