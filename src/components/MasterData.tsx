import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileText,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Attachment, NarrativeItem, Program, SubTask, SubTaskStatus, Task } from '../types';
import { calculateSubTaskProgress, normalizeSubTaskState, STATUS_LABELS, toStatusCode } from '../utils';
import { buildAttachment, DOCUMENT_CATEGORIES, isValidLink, linkSource } from '../documents';

/* =====================================================================
 * MASTER DATA
 * Tiga tabel sesuai struktur database:
 *   Program (programs + program_narratives) · Task List (tasks) · Sub Task (sub_tasks + attachments)
 * Setiap perubahan menulis ke data pusat -> otomatis tersimpan ke MySQL.
 * ===================================================================== */

interface MasterDataProps {
  programs?: Program[];
  setPrograms?: (value: Program[] | ((previous: Program[]) => Program[])) => void;
}

type Tab = 'program' | 'task' | 'subtask';

const ITEMS_PER_PAGE = 10;

const STAGE_OPTIONS = [
  { value: 'A. Perencanaan', label: 'Perencanaan' },
  { value: 'B. Persiapan', label: 'Persiapan' },
  { value: 'C. Pelaksanaan', label: 'Pelaksanaan' },
  { value: 'D. Penyerahan Hasil', label: 'Penyerahan Hasil' },
  { value: 'E. Pensertipikatan', label: 'Pensertipikatan' },
];
const stageLabel = (stage?: string) =>
  STAGE_OPTIONS.find(option => (stage || '').toLowerCase().includes(option.label.toLowerCase()))?.label || stage || '-';

const STATUS_ORDER: SubTaskStatus[] = ['NOT_STARTED', 'WIP', 'DONE', 'DELAYED'];

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

const pct = (value?: number | null) => (value === undefined || value === null || Number.isNaN(value) ? '-' : `${Math.round(value)}%`);

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const avgProgress = (subTasks: SubTask[]) =>
  subTasks.length
    ? Math.round(subTasks.reduce((sum, item) => sum + calculateSubTaskProgress(item.status, item.progress), 0) / subTasks.length)
    : 0;

/* narasi <-> teks: satu butir per baris, format "Judul: uraian" */
const narrativeToText = (items?: NarrativeItem[]) =>
  (items || []).map(item => (item.detail ? `${item.title}: ${item.detail}` : item.title)).join('\n');
const textToNarrative = (text: string): NarrativeItem[] =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const index = line.indexOf(':');
      return index > 0
        ? { title: line.slice(0, index).trim(), detail: line.slice(index + 1).trim() }
        : { title: line, detail: '' };
    });

const inputClass =
  'h-10 w-full rounded-xl border border-[#dce4ef] bg-white px-3 text-[11px] text-[#233b62] outline-none transition focus:border-[#1666c5] focus:ring-2 focus:ring-[#1666c5]/10';

/* ===================================================================== */

export function MasterData({ programs = [], setPrograms }: MasterDataProps) {
  const [tab, setTab] = useState<Tab>('subtask');
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [taskFilter, setTaskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [programModal, setProgramModal] = useState<Program | 'new' | null>(null);
  const [taskModal, setTaskModal] = useState<{ programId: string; task: Task | null } | null>(null);
  const [subTaskModal, setSubTaskModal] = useState<{ programId: string; taskId: string; subTask: SubTask | null } | null>(null);

  const commit = (next: Program[]) => setPrograms?.(next);

  /* ---------- baris data ---------- */
  const programRows = useMemo(
    () =>
      programs.map(program => {
        const subTasks = program.tasks.flatMap(task => task.subTasks);
        return {
          program,
          taskCount: program.tasks.length,
          subTaskCount: subTasks.length,
          done: subTasks.filter(item => toStatusCode(item.status) === 'DONE').length,
          progress: avgProgress(subTasks),
          documents: subTasks.reduce((sum, item) => sum + (item.attachments?.length || 0), 0),
        };
      }),
    [programs],
  );

  const taskRows = useMemo(
    () =>
      programs.flatMap(program =>
        program.tasks.map(task => ({
          program,
          task,
          done: task.subTasks.filter(item => toStatusCode(item.status) === 'DONE').length,
          total: task.subTasks.length,
          progress: avgProgress(task.subTasks),
        })),
      ),
    [programs],
  );

  const subTaskRows = useMemo(
    () =>
      programs.flatMap(program =>
        program.tasks.flatMap(task => task.subTasks.map(subTask => ({ program, task, subTask }))),
      ),
    [programs],
  );

  const keyword = search.trim().toLowerCase();
  const matchProgram = (program: Program) => programFilter === 'ALL' || program.id === programFilter;

  const filteredPrograms = programRows.filter(
    row => matchProgram(row.program) && (!keyword || `${row.program.name} ${row.program.pic} ${row.program.code}`.toLowerCase().includes(keyword)),
  );
  const filteredTasks = taskRows.filter(
    row =>
      matchProgram(row.program) &&
      (taskFilter === 'ALL' || row.task.id === taskFilter) &&
      (!keyword || `${row.task.name} ${row.program.name} ${row.task.stage}`.toLowerCase().includes(keyword)),
  );
  const filteredSubTasks = subTaskRows.filter(
    row =>
      matchProgram(row.program) &&
      (taskFilter === 'ALL' || row.task.id === taskFilter) &&
      (statusFilter === 'ALL' || toStatusCode(row.subTask.status) === statusFilter) &&
      (!keyword ||
        `${row.subTask.name} ${row.task.name} ${row.program.name} ${row.subTask.pic} ${row.subTask.notes}`.toLowerCase().includes(keyword)),
  );

  const activeRows: any[] = tab === 'program' ? filteredPrograms : tab === 'task' ? filteredTasks : filteredSubTasks;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = activeRows.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const taskOptions = programs.filter(matchProgram).flatMap(program => program.tasks.map(task => ({ id: task.id, name: task.name })));

  const summary = {
    programs: programs.length,
    tasks: taskRows.length,
    subTasks: subTaskRows.length,
    done: subTaskRows.filter(row => toStatusCode(row.subTask.status) === 'DONE').length,
    wip: subTaskRows.filter(row => toStatusCode(row.subTask.status) === 'WIP').length,
    notStarted: subTaskRows.filter(row => toStatusCode(row.subTask.status) === 'NOT_STARTED').length,
    documents: subTaskRows.reduce((sum, row) => sum + (row.subTask.attachments?.length || 0), 0),
  };

  const resetFilters = () => {
    setSearch('');
    setProgramFilter('ALL');
    setTaskFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  /* ---------- simpan / hapus ---------- */
  const saveProgram = (program: Program) => {
    const exists = programs.some(item => item.id === program.id);
    commit(exists ? programs.map(item => (item.id === program.id ? program : item)) : [...programs, program]);
    setProgramModal(null);
  };
  const deleteProgram = (program: Program) => {
    const count = program.tasks.reduce((sum, task) => sum + task.subTasks.length, 0);
    if (!window.confirm(`Hapus program "${program.name}" beserta ${program.tasks.length} task dan ${count} sub task?`)) return;
    commit(programs.filter(item => item.id !== program.id));
  };

  const saveTask = (programId: string, task: Task) => {
    commit(
      programs.map(program => {
        if (program.id !== programId) {
          // bila task dipindah ke program lain, hapus dari program lama
          return { ...program, tasks: program.tasks.filter(item => item.id !== task.id) };
        }
        const exists = program.tasks.some(item => item.id === task.id);
        return {
          ...program,
          tasks: exists ? program.tasks.map(item => (item.id === task.id ? task : item)) : [...program.tasks, task],
        };
      }),
    );
    setTaskModal(null);
  };
  const deleteTask = (programId: string, task: Task) => {
    if (!window.confirm(`Hapus task "${task.name}" beserta ${task.subTasks.length} sub task?`)) return;
    commit(programs.map(program => (program.id !== programId ? program : { ...program, tasks: program.tasks.filter(item => item.id !== task.id) })));
  };

  const saveSubTask = (programId: string, taskId: string, subTask: SubTask) => {
    const normalized = normalizeSubTaskState(subTask);
    commit(
      programs.map(program => ({
        ...program,
        tasks: program.tasks.map(task => {
          const withoutThis = task.subTasks.filter(item => item.id !== subTask.id);
          if (program.id === programId && task.id === taskId) {
            const exists = task.subTasks.some(item => item.id === subTask.id);
            return {
              ...task,
              subTasks: exists ? task.subTasks.map(item => (item.id === subTask.id ? normalized : item)) : [...task.subTasks, normalized],
            };
          }
          return withoutThis.length === task.subTasks.length ? task : { ...task, subTasks: withoutThis };
        }),
      })),
    );
    setSubTaskModal(null);
  };
  const deleteSubTask = (programId: string, taskId: string, subTask: SubTask) => {
    if (!window.confirm(`Hapus sub task "${subTask.name}"?`)) return;
    commit(
      programs.map(program =>
        program.id !== programId
          ? program
          : {
              ...program,
              tasks: program.tasks.map(task =>
                task.id !== taskId ? task : { ...task, subTasks: task.subTasks.filter(item => item.id !== subTask.id) },
              ),
            },
      ),
    );
  };

  /* ---------- export ---------- */
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const programSheet = XLSX.utils.json_to_sheet(
      programRows.map(row => ({
        ID: row.program.id,
        'Kode RKM': row.program.code || '',
        Program: row.program.name,
        PIC: row.program.pic || '',
        'Aktual RKM (%)': row.program.rkm?.actual ?? '',
        'Baseline RKM (%)': row.program.rkm?.baseline ?? '',
        'Jumlah Task': row.taskCount,
        'Jumlah Sub Task': row.subTaskCount,
        'Sub Task Selesai': row.done,
        'Progres Sub Task (%)': row.progress,
      })),
    );
    const taskSheet = XLSX.utils.json_to_sheet(
      taskRows.map(row => ({
        ID: row.task.id,
        Program: row.program.name,
        'Task List': row.task.name,
        Jenis: row.task.type === 'NON_RKM' ? 'Non RKM' : 'RKM',
        Tahapan: stageLabel(row.task.stage),
        'Sub Task Selesai': row.done,
        'Total Sub Task': row.total,
        'Progres (%)': row.progress,
      })),
    );
    const subTaskSheet = XLSX.utils.json_to_sheet(
      subTaskRows.map(row => ({
        ID: row.subTask.id,
        Program: row.program.name,
        'Task List': row.task.name,
        'Sub Task': row.subTask.name,
        PIC: row.subTask.pic,
        Status: STATUS_LABELS[toStatusCode(row.subTask.status)],
        'Progres (%)': calculateSubTaskProgress(row.subTask.status, row.subTask.progress),
        'Tgl Mulai': row.subTask.startDate,
        'Tgl Target': row.subTask.dueDate,
        'Jadwal Estimasi': row.subTask.estimatedSchedule ? 'Ya' : 'Tidak',
        Keterangan: row.subTask.notes || '',
        Dokumen: (row.subTask.attachments || []).map(item => `${item.name} (${item.url})`).join('; '),
      })),
    );
    XLSX.utils.book_append_sheet(workbook, programSheet, 'Program');
    XLSX.utils.book_append_sheet(workbook, taskSheet, 'Task List');
    XLSX.utils.book_append_sheet(workbook, subTaskSheet, 'Sub Task');
    XLSX.writeFile(workbook, 'Master_Data_Pengadaan_Tanah.xlsx');
  };

  const openAdd = () => {
    if (tab === 'program') setProgramModal('new');
    if (tab === 'task') setTaskModal({ programId: programFilter !== 'ALL' ? programFilter : programs[0]?.id || '', task: null });
    if (tab === 'subtask') {
      const program = programs.find(item => item.id === programFilter) || programs[0];
      const taskId = taskFilter !== 'ALL' ? taskFilter : program?.tasks[0]?.id || '';
      setSubTaskModal({ programId: program?.id || '', taskId, subTask: null });
    }
  };

  const tabs: Array<{ id: Tab; label: string; count: number; icon: React.ReactNode }> = [
    { id: 'program', label: 'Program', count: summary.programs, icon: <Database size={14} /> },
    { id: 'task', label: 'Task List', count: summary.tasks, icon: <ListChecks size={14} /> },
    { id: 'subtask', label: 'Sub Task', count: summary.subTasks, icon: <FileText size={14} /> },
  ];

  return (
    <div className="space-y-5 text-[#102448]">
      {/* RINGKASAN */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
          ['Program', summary.programs, 'text-[#0B2A63]'],
          ['Task List', summary.tasks, 'text-[#0B2A63]'],
          ['Sub Task', summary.subTasks, 'text-[#0B2A63]'],
          ['Selesai', summary.done, 'text-emerald-700'],
          ['Proses', summary.wip, 'text-blue-700'],
          ['Belum Mulai', summary.notStarted, 'text-slate-500'],
          ['Dokumen tertaut', summary.documents, 'text-[#0B5AA8]'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="rounded-2xl border border-[#e0e7f0] bg-white px-4 py-3 shadow-sm">
            <p className="text-[9.5px] font-semibold text-slate-500">{label}</p>
            <p className={`mt-1 text-[20px] font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[18px] border border-[#e0e7f0] bg-white shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
        {/* TABS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edf5] px-5 pt-4">
          <div className="flex gap-1">
            {tabs.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setPage(1);
                }}
                className={`-mb-px inline-flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-[11.5px] font-bold transition ${
                  tab === item.id ? 'border-[#0B5AA8] bg-blue-50/60 text-[#0B5AA8]' : 'border-transparent text-slate-500 hover:text-[#0B2A63]'
                }`}
              >
                {item.icon}
                {item.label}
                <span className={`rounded-full px-2 py-0.5 text-[9px] ${tab === item.id ? 'bg-[#0B5AA8] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#d7e0ec] bg-white px-3.5 text-[10.5px] font-semibold text-[#203859] hover:bg-slate-50"
            >
              <Download size={14} /> Export Excel
            </button>
            <button
              type="button"
              onClick={openAdd}
              disabled={!setPrograms || (tab !== 'program' && programs.length === 0)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#0B5AA8] px-3.5 text-[10.5px] font-bold text-white hover:bg-[#094b8c] disabled:opacity-40"
            >
              <Plus size={14} /> Tambah {tab === 'program' ? 'Program' : tab === 'task' ? 'Task List' : 'Sub Task'}
            </button>
          </div>
        </div>

        {/* FILTER */}
        <div className="grid grid-cols-1 gap-3 border-b border-[#eef2f7] px-5 py-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_.8fr_auto]">
          <div className="flex h-10 items-center rounded-xl border border-[#dce4ef] bg-white px-3">
            <Search size={15} className="mr-2 text-[#7890ad]" />
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={tab === 'program' ? 'Cari program, PIC, kode RKM…' : tab === 'task' ? 'Cari task list, tahapan…' : 'Cari sub task, PIC, keterangan…'}
              className="w-full bg-transparent text-[11px] outline-none placeholder:text-[#9aa9bc]"
            />
          </div>
          <select
            value={programFilter}
            onChange={event => {
              setProgramFilter(event.target.value);
              setTaskFilter('ALL');
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="ALL">Semua Program</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
          <select
            value={taskFilter}
            onChange={event => {
              setTaskFilter(event.target.value);
              setPage(1);
            }}
            disabled={tab === 'program'}
            className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
          >
            <option value="ALL">Semua Task List</option>
            {taskOptions.map(task => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={event => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            disabled={tab !== 'subtask'}
            className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
          >
            <option value="ALL">Semua Status</option>
            {STATUS_ORDER.map(status => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d7e0ec] px-3 text-[10.5px] font-semibold text-[#607590] hover:bg-slate-50"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        {/* TABEL */}
        <div className="overflow-x-auto">
          {tab === 'program' && (
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-[#e9eef5] bg-[#fbfcfe]">
                  {['No', 'ID / Kode RKM', 'Program', 'PIC', 'Aktual RKM', 'Baseline RKM', 'Task', 'Sub Task', 'Progres Sub Task', 'Dokumen', 'Aksi'].map(head => (
                    <Th key={head}>{head}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row: (typeof programRows)[number], index) => {
                  const gap = row.program.rkm ? row.program.rkm.actual - row.program.rkm.baseline : 0;
                  return (
                    <tr key={row.program.id} className="border-b border-[#edf1f6] hover:bg-[#fafcff]">
                      <Td>{(safePage - 1) * ITEMS_PER_PAGE + index + 1}</Td>
                      <Td>
                        <p className="font-semibold text-[#2b4c76]">{row.program.id}</p>
                        <p className="text-[9px] text-slate-400">{row.program.code || '-'}</p>
                      </Td>
                      <Td>
                        <p className="max-w-[260px] font-bold text-[#142b4d]">{row.program.name}</p>
                        <p className="text-[9px] text-slate-400">
                          {formatDate(row.program.startDate)} – {formatDate(row.program.endDate)}
                        </p>
                      </Td>
                      <Td>{row.program.pic || '-'}</Td>
                      <Td>
                        <b className="text-[#0B2A63]">{pct(row.program.rkm?.actual)}</b>
                        {row.program.rkm && (
                          <span className={`ml-1 text-[9px] font-bold ${gap >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {gap >= 0 ? '▲' : '▼'} {Math.abs(gap)}
                          </span>
                        )}
                      </Td>
                      <Td>{pct(row.program.rkm?.baseline)}</Td>
                      <Td>{row.taskCount}</Td>
                      <Td>
                        {row.done}/{row.subTaskCount} selesai
                      </Td>
                      <Td>
                        <ProgressBar value={row.progress} />
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1">
                          <Link2 size={12} className="text-slate-400" /> {row.documents}
                        </span>
                      </Td>
                      <Td>
                        <RowActions onEdit={() => setProgramModal(row.program)} onDelete={() => deleteProgram(row.program)} disabled={!setPrograms} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'task' && (
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr className="border-b border-[#e9eef5] bg-[#fbfcfe]">
                  {['No', 'Program', 'Task List', 'Jenis', 'Tahapan', 'Sub Task', 'Progres', 'Aksi'].map(head => (
                    <Th key={head}>{head}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row: (typeof taskRows)[number], index) => (
                  <tr key={row.task.id} className="border-b border-[#edf1f6] hover:bg-[#fafcff]">
                    <Td>{(safePage - 1) * ITEMS_PER_PAGE + index + 1}</Td>
                    <Td>
                      <p className="max-w-[200px] text-slate-600">{row.program.name}</p>
                    </Td>
                    <Td>
                      <p className="max-w-[320px] font-bold text-[#142b4d]">{row.task.name}</p>
                      {row.task.description && <p className="max-w-[320px] text-[9px] text-slate-400">{row.task.description}</p>}
                    </Td>
                    <Td>
                      <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold ${row.task.type === 'NON_RKM' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>
                        {row.task.type === 'NON_RKM' ? 'Non RKM' : 'RKM'}
                      </span>
                    </Td>
                    <Td>{stageLabel(row.task.stage)}</Td>
                    <Td>
                      {row.done}/{row.total} selesai
                    </Td>
                    <Td>
                      <ProgressBar value={row.progress} />
                    </Td>
                    <Td>
                      <RowActions
                        onEdit={() => setTaskModal({ programId: row.program.id, task: row.task })}
                        onDelete={() => deleteTask(row.program.id, row.task)}
                        disabled={!setPrograms}
                        extra={
                          <button
                            type="button"
                            title="Tambah sub task ke task ini"
                            disabled={!setPrograms}
                            onClick={() => setSubTaskModal({ programId: row.program.id, taskId: row.task.id, subTask: null })}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ee] bg-white text-emerald-600 hover:bg-emerald-50"
                          >
                            <Plus size={14} />
                          </button>
                        }
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'subtask' && (
            <table className="w-full min-w-[1300px] border-collapse">
              <thead>
                <tr className="border-b border-[#e9eef5] bg-[#fbfcfe]">
                  {['No', 'Sub Task', 'PIC', 'Status', 'Progres', 'Mulai', 'Target', 'Dokumen', 'Keterangan', 'Aksi'].map(head => (
                    <Th key={head}>{head}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row: (typeof subTaskRows)[number], index) => (
                  <tr key={row.subTask.id} className="border-b border-[#edf1f6] align-top hover:bg-[#fafcff]">
                    <Td>{(safePage - 1) * ITEMS_PER_PAGE + index + 1}</Td>
                    <Td>
                      <p className="max-w-[300px] font-bold text-[#142b4d]">{row.subTask.name}</p>
                      <p className="max-w-[300px] text-[9px] text-slate-400">
                        {row.task.name} · {row.program.name}
                      </p>
                    </Td>
                    <Td>{row.subTask.pic || '-'}</Td>
                    <Td>
                      <StatusBadge status={toStatusCode(row.subTask.status)} />
                    </Td>
                    <Td>
                      <ProgressBar value={calculateSubTaskProgress(row.subTask.status, row.subTask.progress)} />
                    </Td>
                    <Td>{formatDate(row.subTask.startDate)}</Td>
                    <Td>
                      {formatDate(row.subTask.dueDate)}
                      {row.subTask.estimatedSchedule && toStatusCode(row.subTask.status) !== 'DONE' && <span title="Tanggal masih estimasi (rencana RKM)">*</span>}
                    </Td>
                    <Td>
                      {(row.subTask.attachments || []).length === 0 ? (
                        <span className="text-slate-300">-</span>
                      ) : (
                        <div className="max-w-[170px] space-y-0.5">
                          {(row.subTask.attachments || []).slice(0, 2).map(item => (
                            <a
                              key={item.id}
                              href={item.url || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 truncate text-[9.5px] font-semibold text-[#0B5AA8] hover:underline"
                              title={item.url}
                            >
                              <Link2 size={11} className="shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </a>
                          ))}
                          {(row.subTask.attachments || []).length > 2 && (
                            <p className="text-[9px] text-slate-400">+{(row.subTask.attachments || []).length - 2} lainnya</p>
                          )}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <p className="line-clamp-2 max-w-[220px] text-[9.5px] text-slate-500" title={row.subTask.notes}>
                        {row.subTask.notes || '-'}
                      </p>
                    </Td>
                    <Td>
                      <RowActions
                        onEdit={() => setSubTaskModal({ programId: row.program.id, taskId: row.task.id, subTask: row.subTask })}
                        onDelete={() => deleteSubTask(row.program.id, row.task.id, row.subTask)}
                        disabled={!setPrograms}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pageRows.length === 0 && (
            <div className="px-5 py-14 text-center">
              <FileText size={28} className="mx-auto text-[#9aacbf]" />
              <p className="mt-3 text-sm font-semibold text-[#334968]">Data tidak ditemukan</p>
              <p className="mt-1 text-xs text-[#8a9ab0]">Ubah filter atau tambahkan data baru.</p>
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#e7edf4] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-[#7589a4]">
            Menampilkan {activeRows.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, activeRows.length)} dari{' '}
            {activeRows.length} data{tab === 'subtask' && ' · * tanggal masih estimasi rencana RKM'}
          </p>
          <div className="flex items-center gap-1.5">
            <PageButton disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft size={14} />
            </PageButton>
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index + 1)}
                className={`h-8 min-w-8 rounded-lg border px-2 text-[10px] font-semibold ${
                  safePage === index + 1 ? 'border-[#1267c7] bg-[#1267c7] text-white' : 'border-[#dce4ef] bg-white text-[#29415f]'
                }`}
              >
                {index + 1}
              </button>
            ))}
            <PageButton disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>
              <ChevronRight size={14} />
            </PageButton>
          </div>
        </footer>
      </section>

      {programModal && (
        <ProgramForm
          initial={programModal === 'new' ? null : programModal}
          existingIds={programs.map(program => program.id)}
          onClose={() => setProgramModal(null)}
          onSave={saveProgram}
        />
      )}
      {taskModal && (
        <TaskForm
          programs={programs}
          programId={taskModal.programId}
          initial={taskModal.task}
          onClose={() => setTaskModal(null)}
          onSave={saveTask}
        />
      )}
      {subTaskModal && (
        <SubTaskForm
          programs={programs}
          programId={subTaskModal.programId}
          taskId={subTaskModal.taskId}
          initial={subTaskModal.subTask}
          onClose={() => setSubTaskModal(null)}
          onSave={saveSubTask}
        />
      )}
    </div>
  );
}

/* =====================================================================
 * FORM PROGRAM
 * ===================================================================== */
function ProgramForm({
  initial,
  existingIds,
  onClose,
  onSave,
}: {
  initial: Program | null;
  existingIds: string[];
  onClose: () => void;
  onSave: (program: Program) => void;
}) {
  const nextId = () => {
    let n = existingIds.length + 1;
    while (existingIds.includes(`PRG-${String(n).padStart(2, '0')}`)) n += 1;
    return `PRG-${String(n).padStart(2, '0')}`;
  };
  const [form, setForm] = useState({
    id: initial?.id || nextId(),
    code: initial?.code || '',
    name: initial?.name || '',
    pic: initial?.pic || '',
    actual: initial?.rkm?.actual !== undefined ? String(initial.rkm.actual) : '',
    baseline: initial?.rkm?.baseline !== undefined ? String(initial.rkm.baseline) : '',
    rkmStatus: initial?.rkm?.status || 'On Progress',
    startDate: initial?.startDate || '2026-01-01',
    endDate: initial?.endDate || '2026-12-31',
    capaian: narrativeToText(initial?.capaian),
    isu: narrativeToText(initial?.isu),
    nextStep: narrativeToText(initial?.nextStep),
  });
  const [error, setError] = useState('');
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  const submit = () => {
    if (!form.name.trim()) return setError('Nama program wajib diisi.');
    const actual = form.actual === '' ? null : Number(form.actual);
    const baseline = form.baseline === '' ? null : Number(form.baseline);
    if ((actual !== null && (actual < 0 || actual > 100)) || (baseline !== null && (baseline < 0 || baseline > 100))) {
      return setError('Aktual & baseline RKM harus 0–100.');
    }
    onSave({
      ...(initial || { tasks: [] }),
      id: form.id,
      code: form.code.trim() || undefined,
      name: form.name.trim(),
      pic: form.pic.trim() || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      rkm: actual !== null ? { actual, baseline: baseline ?? 0, status: form.rkmStatus || 'On Progress' } : undefined,
      capaian: textToNarrative(form.capaian),
      isu: textToNarrative(form.isu),
      nextStep: textToNarrative(form.nextStep),
      tasks: initial?.tasks || [],
    } as Program);
  };

  return (
    <Modal title={initial ? 'Edit Program' : 'Tambah Program'} subtitle="Data program, PIC, angka RKM dan narasi laporan." onClose={onClose} onSubmit={submit} error={error}>
      <Field label="ID program">
        <input value={form.id} disabled className={`${inputClass} bg-slate-50`} />
      </Field>
      <Field label="Kode RKM">
        <input value={form.code} onChange={event => set('code', event.target.value)} placeholder="IS-18-KMSL-01-0x" className={inputClass} />
      </Field>
      <Field label="Nama program *" wide>
        <input value={form.name} onChange={event => set('name', event.target.value)} className={inputClass} />
      </Field>
      <Field label="PIC program">
        <input value={form.pic} onChange={event => set('pic', event.target.value)} className={inputClass} />
      </Field>
      <Field label="Status RKM">
        <input value={form.rkmStatus} onChange={event => set('rkmStatus', event.target.value)} className={inputClass} />
      </Field>
      <Field label="Aktual RKM (%)">
        <input type="number" min={0} max={100} value={form.actual} onChange={event => set('actual', event.target.value)} className={inputClass} />
      </Field>
      <Field label="Baseline RKM (%)">
        <input type="number" min={0} max={100} value={form.baseline} onChange={event => set('baseline', event.target.value)} className={inputClass} />
      </Field>
      <Field label="Tanggal mulai">
        <input type="date" value={form.startDate} onChange={event => set('startDate', event.target.value)} className={inputClass} />
      </Field>
      <Field label="Tanggal selesai">
        <input type="date" value={form.endDate} onChange={event => set('endDate', event.target.value)} className={inputClass} />
      </Field>
      <p className="text-[9.5px] text-slate-400 md:col-span-2">
        Narasi laporan: satu butir per baris dengan format <b>Judul: uraian</b>. Tampil di Laporan &amp; Analitik.
      </p>
      {(['capaian', 'isu', 'nextStep'] as const).map(key => (
        <Field key={key} label={key === 'capaian' ? 'Capaian' : key === 'isu' ? 'Isu' : 'Next Step'} wide>
          <textarea value={form[key]} onChange={event => set(key, event.target.value)} rows={3} className={`${inputClass} h-auto py-2 leading-5`} />
        </Field>
      ))}
    </Modal>
  );
}

/* =====================================================================
 * FORM TASK
 * ===================================================================== */
function TaskForm({
  programs,
  programId,
  initial,
  onClose,
  onSave,
}: {
  programs: Program[];
  programId: string;
  initial: Task | null;
  onClose: () => void;
  onSave: (programId: string, task: Task) => void;
}) {
  const [form, setForm] = useState({
    programId,
    name: initial?.name || '',
    type: initial?.type || 'RKM',
    stage: STAGE_OPTIONS.find(option => (initial?.stage || '').toLowerCase().includes(option.label.toLowerCase()))?.value || 'C. Pelaksanaan',
    taskCode: initial?.taskCode || '',
    description: initial?.description || '',
  });
  const [error, setError] = useState('');
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  const submit = () => {
    if (!form.programId) return setError('Pilih program.');
    if (!form.name.trim()) return setError('Nama task list wajib diisi.');
    onSave(form.programId, {
      ...(initial || { subTasks: [] }),
      id: initial?.id || uid('TSK'),
      name: form.name.trim(),
      type: form.type as Task['type'],
      stage: form.stage,
      taskCode: form.taskCode.trim() || undefined,
      description: form.description.trim() || undefined,
      subTasks: initial?.subTasks || [],
    } as Task);
  };

  return (
    <Modal title={initial ? 'Edit Task List' : 'Tambah Task List'} subtitle="Task list dikelompokkan per program." onClose={onClose} onSubmit={submit} error={error}>
      <Field label="Program *" wide>
        <select value={form.programId} onChange={event => set('programId', event.target.value)} className={inputClass}>
          {programs.map(program => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nama task list *" wide>
        <input value={form.name} onChange={event => set('name', event.target.value)} placeholder="mis. Konsinyasi dan Pengosongan Lahan (RKM)" className={inputClass} />
      </Field>
      <Field label="Jenis">
        <select value={form.type} onChange={event => set('type', event.target.value)} className={inputClass}>
          <option value="RKM">RKM</option>
          <option value="NON_RKM">Non RKM</option>
        </select>
      </Field>
      <Field label="Tahapan">
        <select value={form.stage} onChange={event => set('stage', event.target.value)} className={inputClass}>
          {STAGE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Kode task">
        <input value={form.taskCode} onChange={event => set('taskCode', event.target.value)} placeholder="opsional, mis. C.5" className={inputClass} />
      </Field>
      <Field label="Deskripsi" wide>
        <input value={form.description} onChange={event => set('description', event.target.value)} className={inputClass} />
      </Field>
    </Modal>
  );
}

/* =====================================================================
 * FORM SUB TASK (+ link dokumen OneDrive)
 * ===================================================================== */
function SubTaskForm({
  programs,
  programId,
  taskId,
  initial,
  onClose,
  onSave,
}: {
  programs: Program[];
  programId: string;
  taskId: string;
  initial: SubTask | null;
  onClose: () => void;
  onSave: (programId: string, taskId: string, subTask: SubTask) => void;
}) {
  const [target, setTarget] = useState({ programId, taskId });
  const program = programs.find(item => item.id === target.programId);
  const [form, setForm] = useState({
    name: initial?.name || '',
    pic: initial?.pic || program?.pic || '',
    status: toStatusCode(initial?.status || 'NOT_STARTED') as SubTaskStatus,
    progress: String(initial ? calculateSubTaskProgress(initial.status, initial.progress) : 0),
    startDate: initial?.startDate || '',
    dueDate: initial?.dueDate || '',
    estimatedSchedule: initial?.estimatedSchedule ?? false,
    notes: initial?.notes || '',
  });
  const [attachments, setAttachments] = useState<Attachment[]>(initial?.attachments || []);
  const [docForm, setDocForm] = useState({ name: '', url: '', category: 'Dokumen Pendukung' });
  const [error, setError] = useState('');
  const set = (key: keyof typeof form, value: any) => setForm(previous => ({ ...previous, [key]: value }));

  const addDocument = () => {
    if (!docForm.name.trim()) return setError('Isi nama dokumen.');
    if (!isValidLink(docForm.url)) return setError('Link dokumen harus diawali https:// (OneDrive: Share → Copy link).');
    setAttachments(previous => [...previous, buildAttachment(docForm)]);
    setDocForm({ name: '', url: '', category: docForm.category });
    setError('');
  };

  const submit = () => {
    if (!target.programId || !target.taskId) return setError('Pilih program dan task list.');
    if (!form.name.trim()) return setError('Nama sub task wajib diisi.');
    const progress = Number(form.progress);
    if (Number.isNaN(progress) || progress < 0 || progress > 100) return setError('Progres harus 0–100.');
    if (form.startDate && form.dueDate && form.dueDate < form.startDate) return setError('Tanggal target tidak boleh sebelum tanggal mulai.');
    onSave(target.programId, target.taskId, {
      ...(initial || {}),
      id: initial?.id || uid('SUB'),
      name: form.name.trim(),
      pic: form.pic.trim(),
      status: form.status,
      progress,
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedSchedule: form.estimatedSchedule,
      notes: form.notes.trim(),
      attachments,
    } as SubTask);
  };

  return (
    <Modal
      title={initial ? 'Edit Sub Task' : 'Tambah Sub Task'}
      subtitle="Progres 100% otomatis menjadi Selesai. Link dokumen OneDrive tampil juga di Arsip Dokumen."
      onClose={onClose}
      onSubmit={submit}
      error={error}
    >
      <Field label="Program *">
        <select
          value={target.programId}
          onChange={event => {
            const next = programs.find(item => item.id === event.target.value);
            setTarget({ programId: event.target.value, taskId: next?.tasks[0]?.id || '' });
          }}
          className={inputClass}
        >
          {programs.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Task list *">
        <select value={target.taskId} onChange={event => setTarget(previous => ({ ...previous, taskId: event.target.value }))} className={inputClass}>
          {(program?.tasks || []).map(task => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nama sub task *" wide>
        <input value={form.name} onChange={event => set('name', event.target.value)} className={inputClass} />
      </Field>
      <Field label="PIC">
        <input value={form.pic} onChange={event => set('pic', event.target.value)} className={inputClass} />
      </Field>
      <Field label="Status">
        <select
          value={form.status}
          onChange={event => {
            const status = event.target.value as SubTaskStatus;
            setForm(previous => ({
              ...previous,
              status,
              progress: status === 'DONE' ? '100' : status === 'NOT_STARTED' ? '0' : previous.progress === '100' ? '90' : previous.progress,
            }));
          }}
          className={inputClass}
        >
          {STATUS_ORDER.map(status => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Progres (%)">
        <input
          type="number"
          min={0}
          max={100}
          value={form.progress}
          onChange={event => {
            const value = event.target.value;
            const number = Number(value);
            setForm(previous => ({
              ...previous,
              progress: value,
              status: number >= 100 ? 'DONE' : number > 0 && previous.status === 'NOT_STARTED' ? 'WIP' : previous.status === 'DONE' && number < 100 ? 'WIP' : previous.status,
            }));
          }}
          className={inputClass}
        />
      </Field>
      <Field label="Jadwal">
        <label className="flex h-10 items-center gap-2 text-[11px] text-slate-600">
          <input type="checkbox" checked={form.estimatedSchedule} onChange={event => set('estimatedSchedule', event.target.checked)} />
          Tanggal masih estimasi
        </label>
      </Field>
      <Field label="Tanggal mulai">
        <input type="date" value={form.startDate} onChange={event => set('startDate', event.target.value)} className={inputClass} />
      </Field>
      <Field label="Tanggal target">
        <input type="date" value={form.dueDate} onChange={event => set('dueDate', event.target.value)} className={inputClass} />
      </Field>
      <Field label="Keterangan / hambatan" wide>
        <textarea value={form.notes} onChange={event => set('notes', event.target.value)} rows={2} className={`${inputClass} h-auto py-2 leading-5`} />
      </Field>

      {/* DOKUMEN */}
      <div className="rounded-xl border border-[#e0e7f0] bg-slate-50/60 p-3 md:col-span-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#0B2A63]">
          <Link2 size={14} /> Dokumen (link OneDrive / SharePoint)
        </p>
        <div className="mt-2 space-y-1.5">
          {attachments.length === 0 && <p className="text-[10px] text-slate-400">Belum ada dokumen tertaut.</p>}
          {attachments.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
              <div className="min-w-0">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[10.5px] font-semibold text-[#0B5AA8] hover:underline">
                  {item.name}
                </a>
                <p className="truncate text-[9px] text-slate-400">
                  {item.category || 'Dokumen'} · {linkSource(item.url)} · {formatDate(item.uploadedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttachments(previous => previous.filter(doc => doc.id !== item.id))}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                title="Hapus tautan"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1.4fr_.9fr_auto]">
          <input value={docForm.name} onChange={event => setDocForm(previous => ({ ...previous, name: event.target.value }))} placeholder="Nama dokumen" className={inputClass} />
          <input value={docForm.url} onChange={event => setDocForm(previous => ({ ...previous, url: event.target.value }))} placeholder="https://…sharepoint.com/… atau 1drv.ms/…" className={inputClass} />
          <select value={docForm.category} onChange={event => setDocForm(previous => ({ ...previous, category: event.target.value }))} className={inputClass}>
            {DOCUMENT_CATEGORIES.map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button type="button" onClick={addDocument} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[#0B5AA8] px-3 text-[10.5px] font-bold text-[#0B5AA8] hover:bg-blue-50">
            <Plus size={13} /> Tautkan
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =====================================================================
 * KOMPONEN KECIL
 * ===================================================================== */
function Modal({
  title,
  subtitle,
  children,
  onClose,
  onSubmit,
  error,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  error?: string;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#07172b]/45 p-4">
      <div className="flex max-h-[94vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#142b4d]">{title}</h3>
            {subtitle && <p className="mt-1 text-[10.5px] text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-6 py-5 md:grid-cols-2">{children}</div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
          <p className="text-[10.5px] font-semibold text-red-600">{error}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-semibold text-slate-600">
              Batal
            </button>
            <button type="button" onClick={onSubmit} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0B5AA8] px-5 text-[11px] font-bold text-white hover:bg-[#094b8c]">
              <CheckCircle2 size={14} /> Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <span className="mb-1 block text-[10px] font-semibold text-[#405a79]">{label}</span>
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wide text-[#6f84a0]">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle text-[10.5px] text-[#334b6c]">{children}</td>;
}

function ProgressBar({ value }: { value: number }) {
  const safe = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="w-[96px]">
      <p className="mb-1 text-[10px] font-bold text-[#243b5e]">{safe}%</p>
      <div className="h-[5px] overflow-hidden rounded-full bg-[#e7edf4]">
        <div className={`h-full rounded-full ${safe === 100 ? 'bg-emerald-500' : 'bg-[#0c4b91]'}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SubTaskStatus }) {
  const style: Record<SubTaskStatus, string> = {
    DONE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    WIP: 'border-blue-200 bg-blue-50 text-blue-700',
    NOT_STARTED: 'border-slate-200 bg-slate-50 text-slate-500',
    DELAYED: 'border-red-200 bg-red-50 text-red-600',
  };
  return <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-bold ${style[status]}`}>{STATUS_LABELS[status]}</span>;
}

function RowActions({
  onEdit,
  onDelete,
  disabled,
  extra,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {extra}
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        title="Edit"
        className="grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ee] bg-white text-[#0865c8] hover:bg-blue-50 disabled:opacity-40"
      >
        <Pencil size={13} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        title="Hapus"
        className="grid h-8 w-8 place-items-center rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 disabled:opacity-40"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function PageButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ef] bg-white text-[#29415f] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
