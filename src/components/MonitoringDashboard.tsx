import React, { useMemo, useState } from 'react';
import {
  LandAcquisitionMap,
} from './LandAcquisitionMap';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileCheck2,
  Layers3,
  MoreVertical,
  Upload,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { DashboardStats, Program } from '../types';
import {
  calculateDashboardStats,
  calculateProgramMetrics,
  CURRENT_DATE_STR,
  isSubTaskOverdue,
} from '../utils';

interface MonitoringDashboardProps {
  programs: Program[];
  stats: DashboardStats;
}

type ProgramTask = Program['tasks'][number];
type ProgramSubTask = ProgramTask['subTasks'][number];

interface OverdueItem {
  id: string;
  programName: string;
  taskName: string;
  subTaskName: string;
  pic: string;
  dueDate: string;
  delayDays: number;
  notes?: string;
}

interface UpcomingTargetItem {
  id: string;
  programName: string;
  taskName: string;
  subTaskName: string;
  dueDate: string;
  daysLeft: number;
  pic: string;
}

const STATUS_COLORS = {
  DONE: '#16A34A',
  WIP: '#2563EB',
  NOT_STARTED: '#94A3B8',
  DELAYED: '#EF4444',
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getProgramColor = (index: number) => {
  const colors = ['#1467E8', '#18A85A', '#F59E0B'];
  return colors[index % colors.length];
};

const getProgramTextColor = (index: number) => {
  const colors = ['text-blue-700', 'text-emerald-700', 'text-amber-700'];
  return colors[index % colors.length];
};

const getProgramBgColor = (index: number) => {
  const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500'];
  return colors[index % colors.length];
};

const getSubTaskProgress = (subTask: ProgramSubTask) => {
  const explicitProgress = (subTask as ProgramSubTask & { progress?: number }).progress;

  if (typeof explicitProgress === 'number' && Number.isFinite(explicitProgress)) {
    return clamp(Math.round(explicitProgress));
  }

  if (subTask.status === 'DONE') return 100;
  if (subTask.status === 'WIP') return 50;
  return 0;
};

export function MonitoringDashboard({
  programs,
}: MonitoringDashboardProps) {
  const [selectedProgramId, setSelectedProgramId] = useState('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState('ALL');

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId),
    [programs, selectedProgramId],
  );

  const taskOptions = selectedProgram?.tasks ?? [];

  const filteredPrograms = useMemo(() => {
    if (selectedProgramId === 'ALL') return programs;

    const matchingProgram = programs.find(
      (program) => program.id === selectedProgramId,
    );

    if (!matchingProgram) return programs;

    if (selectedTaskId === 'ALL') return [matchingProgram];

    const matchingTask = matchingProgram.tasks.find(
      (task) => task.id === selectedTaskId,
    );

    return [
      {
        ...matchingProgram,
        tasks: matchingTask ? [matchingTask] : matchingProgram.tasks,
      },
    ];
  }, [programs, selectedProgramId, selectedTaskId]);

  const filteredStats = useMemo(
    () => calculateDashboardStats(filteredPrograms),
    [filteredPrograms],
  );

  const programProgressData = useMemo(
    () =>
      filteredPrograms.map((program) => {
        const metrics = calculateProgramMetrics(program);

        return {
          id: program.id,
          name: program.name,
          progress: clamp(metrics.progress),
          risk: metrics.isAtRisk,
        };
      }),
    [filteredPrograms],
  );

  const statusData = useMemo(() => {
    let done = 0;
    let wip = 0;
    let delayed = 0;
    let notStarted = 0;

    filteredPrograms.forEach((program) => {
      program.tasks.forEach((task) => {
        task.subTasks.forEach((subTask) => {
          if (subTask.status === 'DONE') done += 1;
          if (subTask.status === 'WIP') wip += 1;
          if (subTask.status === 'DELAYED') delayed += 1;
          if (subTask.status === 'NOT_STARTED') notStarted += 1;
        });
      });
    });

    const total = done + wip + delayed + notStarted;

    return [
      {
        key: 'DONE',
        name: 'Selesai',
        value: done,
        color: STATUS_COLORS.DONE,
        percentage: total ? Math.round((done / total) * 100) : 0,
      },
      {
        key: 'WIP',
        name: 'Proses',
        value: wip,
        color: STATUS_COLORS.WIP,
        percentage: total ? Math.round((wip / total) * 100) : 0,
      },
      {
        key: 'NOT_STARTED',
        name: 'Belum Mulai',
        value: notStarted,
        color: STATUS_COLORS.NOT_STARTED,
        percentage: total ? Math.round((notStarted / total) * 100) : 0,
      },
      {
        key: 'DELAYED',
        name: 'Tertunda',
        value: delayed,
        color: STATUS_COLORS.DELAYED,
        percentage: total ? Math.round((delayed / total) * 100) : 0,
      },
    ];
  }, [filteredPrograms]);

  const totalFilteredSubTasks = statusData.reduce(
    (total, status) => total + status.value,
    0,
  );

  const overdueList: OverdueItem[] = useMemo(() => {
    const currentTime = new Date(CURRENT_DATE_STR).getTime();
    const items: OverdueItem[] = [];

    filteredPrograms.forEach((program) => {
      program.tasks.forEach((task) => {
        task.subTasks.forEach((subTask) => {
          if (!isSubTaskOverdue(subTask)) return;

          const targetTime = new Date(subTask.dueDate).getTime();
          if (Number.isNaN(currentTime) || Number.isNaN(targetTime)) return;

          items.push({
            id: subTask.id,
            programName: program.name,
            taskName: task.name,
            subTaskName: subTask.name,
            pic: subTask.pic,
            dueDate: subTask.dueDate,
            delayDays: Math.max(
              1,
              Math.ceil((currentTime - targetTime) / (1000 * 60 * 60 * 24)),
            ),
            notes: subTask.notes,
          });
        });
      });
    });

    return items.sort((a, b) => b.delayDays - a.delayDays);
  }, [filteredPrograms]);

  const riskPrograms = useMemo(
    () =>
      filteredPrograms
        .map((program) => {
          const metrics = calculateProgramMetrics(program);
          const overdueCount = program.tasks.reduce(
            (total, task) =>
              total +
              task.subTasks.filter((subTask) => isSubTaskOverdue(subTask)).length,
            0,
          );

          return {
            id: program.id,
            name: program.name,
            progress: clamp(metrics.progress),
            overdueCount,
            isAtRisk: metrics.isAtRisk,
            target:
              program.tasks
                .flatMap((task) => task.subTasks)
                .map((subTask) => subTask.dueDate)
                .filter(Boolean)
                .sort()[0] ?? '-',
          };
        })
        .filter((program) => program.isAtRisk || program.overdueCount > 0)
        .sort((a, b) => b.overdueCount - a.overdueCount),
    [filteredPrograms],
  );

  const upcomingTargets: UpcomingTargetItem[] = useMemo(() => {
    const currentTime = new Date(CURRENT_DATE_STR).getTime();
    const items: UpcomingTargetItem[] = [];

    if (Number.isNaN(currentTime)) return items;

    filteredPrograms.forEach((program) => {
      program.tasks.forEach((task) => {
        task.subTasks.forEach((subTask) => {
          if (subTask.status === 'DONE') return;

          const dueTime = new Date(subTask.dueDate).getTime();
          if (Number.isNaN(dueTime) || dueTime < currentTime) return;

          const daysLeft = Math.ceil(
            (dueTime - currentTime) / (1000 * 60 * 60 * 24),
          );

          items.push({
            id: subTask.id,
            programName: program.name,
            taskName: task.name,
            subTaskName: subTask.name,
            dueDate: subTask.dueDate,
            daysLeft,
            pic: subTask.pic,
          });
        });
      });
    });

    return items
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      .slice(0, 4);
  }, [filteredPrograms]);

  const recentActivities = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      user: string;
      icon: 'done' | 'process' | 'delay';
    }> = [];

    filteredPrograms.forEach((program) => {
      program.tasks.forEach((task) => {
        task.subTasks.forEach((subTask) => {
          items.push({
            id: `${program.id}-${task.id}-${subTask.id}`,
            title:
              subTask.status === 'DONE'
                ? 'Status pekerjaan diselesaikan'
                : subTask.status === 'DELAYED'
                  ? 'Target pekerjaan memerlukan perhatian'
                  : 'Status pelaksanaan diperbarui',
            subtitle: `${task.name} · ${program.name}`,
            user: subTask.pic,
            icon:
              subTask.status === 'DONE'
                ? 'done'
                : subTask.status === 'DELAYED'
                  ? 'delay'
                  : 'process',
          });
        });
      });
    });

    return items.slice(0, 4);
  }, [filteredPrograms]);

  const selectedProgramName =
    selectedProgramId === 'ALL'
      ? 'Semua Program'
      : selectedProgram?.name ?? 'Semua Program';

  const selectedTaskName =
    selectedTaskId === 'ALL'
      ? 'Semua Tahapan'
      : taskOptions.find((task) => task.id === selectedTaskId)?.name ??
        'Semua Tahapan';

  return (
    <div id="dashboard-monitoring" className="space-y-4 pb-6">
      {/* BARIS UTAMA: PETA + PROGRESS PROGRAM + STATUS */}
      <section className="grid grid-cols-1 gap-4 2xl:grid-cols-12">
        {/* PETA */}
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm 2xl:col-span-7">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-[13px] font-extrabold text-[#0B2A63]">
                Peta Sebaran Pengadaan Tanah
              </h2>
              <p className="mt-1 text-[9px] text-slate-400">
                Visualisasi sebaran lokasi berdasarkan program pengadaan tanah.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <select
                  value={selectedProgramId}
                  onChange={(event) => {
                    setSelectedProgramId(event.target.value);
                    setSelectedTaskId('ALL');
                  }}
                  className="h-9 min-w-[132px] appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[9px] font-semibold text-slate-600 outline-none focus:border-blue-500"
                >
                  <option value="ALL">Semua Program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </label>

              <label className="relative">
                <select
                  value={selectedTaskId}
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                  disabled={selectedProgramId === 'ALL'}
                  className="h-9 min-w-[132px] appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[9px] font-semibold text-slate-600 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="ALL">
                    {selectedProgramId === 'ALL'
                      ? 'Semua Tahapan'
                      : 'Semua Tahapan'}
                  </option>
                  {taskOptions.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </label>

              <div
                className="flex h-9 cursor-default items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600"
                title="Pilihan Peta Jalan / Satelit tersedia pada kontrol layer di dalam peta"
              >
                <Layers3 className="h-3.5 w-3.5 text-blue-600" />
                Layer
              </div>
            </div>
          </div>

          {/* LIVE INTERACTIVE MAP */}
          <LandAcquisitionMap
            selectedProgramName={selectedProgramName}
          />

          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
            {programProgressData.slice(0, 3).map((program, index) => (
              <div
                key={program.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-extrabold text-white ${getProgramBgColor(index)}`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 min-h-7 text-[9px] font-bold leading-3.5 text-slate-700">
                      {program.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[8px] text-slate-400">Progress</span>
                      <strong className="text-[10px] text-[#0B2A63]">
                        {program.progress}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* PROGRESS TIAP PROGRAM */}
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm 2xl:col-span-2">
          <h2 className="text-[13px] font-extrabold text-[#0B2A63]">
            Progress Tiap Program
          </h2>
          <p className="mt-1 text-[9px] leading-4 text-slate-400">
            Rata-rata progress seluruh sub-task per program.
          </p>

          <div className="mt-5 space-y-5">
            {programProgressData.slice(0, 5).map((program, index) => (
              <div key={program.id}>
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-extrabold text-white ${getProgramBgColor(index)}`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-end justify-between gap-2">
                      <p className="line-clamp-2 text-[9.5px] font-bold leading-4 text-[#0B2A63]">
                        {program.name}
                      </p>
                      <strong className={`shrink-0 text-[16px] ${getProgramTextColor(index)}`}>
                        {program.progress}%
                      </strong>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${program.progress}%`,
                          backgroundColor: getProgramColor(index),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="mx-auto mt-6 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[8.5px] font-semibold text-blue-600">
            Lihat Detail Program
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </article>

        {/* STATUS SUBTASK */}
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm 2xl:col-span-3">
          <h2 className="text-[13px] font-extrabold text-[#0B2A63]">
            Distribusi Status Sub-Task
          </h2>
          <p className="mt-1 text-[9px] text-slate-400">
            Total {totalFilteredSubTasks} Sub-Task
          </p>

          <div className="mt-5 grid grid-cols-[1.05fr_.95fr] items-center gap-3">
            <div className="relative h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {statusData.map((status) => (
                      <Cell key={status.key} fill={status.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                       `${Array.isArray(value) ? value.join(', ') : value ?? 0} sub-task`,
                       'Jumlah',
                    ]}
                
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-[25px] font-extrabold text-[#0B2A63]">
                  {totalFilteredSubTasks}
                </strong>
                <span className="text-[8px] font-semibold text-slate-400">
                  Sub-Task
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {statusData.map((status) => (
                <div key={status.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[8.5px] font-semibold text-slate-600">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                  </span>
                  <span className="text-[8px] text-slate-500">
                    {status.value} ({status.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button className="mx-auto mt-5 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[8.5px] font-semibold text-blue-600">
            Lihat Detail Sub-Task
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </article>
      </section>

      {/* BARIS BAWAH */}
      <section className="grid grid-cols-1 gap-4 2xl:grid-cols-12">
        {/* PROGRAM PERLU PERHATIAN */}
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm 2xl:col-span-5">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-[13px] font-extrabold text-[#0B2A63]">
              Program Memerlukan Perhatian
            </h2>
            <p className="mt-1 text-[9px] text-slate-400">
              Program dengan progress rendah atau memiliki pekerjaan overdue.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[630px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-[7.5px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2.5">Program</th>
                  <th className="px-3 py-2.5">Progress</th>
                  <th className="px-3 py-2.5">Overdue</th>
                  <th className="px-3 py-2.5">Target</th>
                  <th className="px-3 py-2.5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(riskPrograms.length ? riskPrograms : programProgressData).slice(0, 3).map((program, index) => {
                  const riskProgram = 'overdueCount' in program ? program : null;
                  const progress = program.progress;
                  const overdueCount = riskProgram?.overdueCount ?? 0;
                  const target = riskProgram?.target ?? '-';

                  return (
                    <tr key={program.id}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-extrabold text-white ${getProgramBgColor(index)}`}>
                            {index + 1}
                          </span>
                          <span className="line-clamp-2 text-[8.5px] font-bold leading-3.5 text-[#0B2A63]">
                            {program.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <strong className="text-[8.5px] text-[#0B2A63]">
                            {progress}%
                          </strong>
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={overdueCount ? 'text-[8.5px] font-bold text-red-500' : 'text-[8.5px] text-slate-400'}>
                          {overdueCount}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[8px] text-slate-500">
                        {target === '-' ? '-' : formatDate(target)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button className="rounded-md border border-slate-200 px-2 py-1 text-[7.5px] font-semibold text-blue-600">
                            Lihat Detail
                          </button>
                          <button className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-400">
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 p-3 text-center">
            <button className="inline-flex items-center gap-1.5 text-[8.5px] font-semibold text-blue-600">
              Lihat Semua Program
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </article>

        {/* AKTIVITAS TERBARU */}
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm 2xl:col-span-4">
          <h2 className="text-[13px] font-extrabold text-[#0B2A63]">
            Aktivitas Terbaru
          </h2>
          <p className="mt-1 text-[9px] text-slate-400">
            Ringkasan perubahan status pada data aktif.
          </p>

          <div className="mt-3 divide-y divide-slate-100">
            {recentActivities.length === 0 ? (
              <div className="flex min-h-[170px] items-center justify-center text-[9px] text-slate-400">
                Belum ada aktivitas pada data aktif.
              </div>
            ) : (
              recentActivities.map((activity) => {
                const icon =
                  activity.icon === 'done' ? (
                    <Upload className="h-3.5 w-3.5" />
                  ) : activity.icon === 'delay' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <FileCheck2 className="h-3.5 w-3.5" />
                  );

                const iconClass =
                  activity.icon === 'done'
                    ? 'bg-emerald-50 text-emerald-600'
                    : activity.icon === 'delay'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600';

                return (
                  <div
                    key={activity.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[8.8px] font-bold text-[#0B2A63]">
                        {activity.title}
                      </p>
                      <p className="mt-0.5 truncate text-[7.8px] text-slate-400">
                        {activity.subtitle}
                      </p>
                    </div>
                    <span className="max-w-[72px] truncate text-right text-[7.5px] text-slate-500">
                      {activity.user}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <button className="mx-auto mt-3 flex items-center gap-1.5 text-[8.5px] font-semibold text-blue-600">
            Lihat Semua Aktivitas
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </article>

        {/* UPCOMING TARGET */}
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm 2xl:col-span-3">
          <h2 className="text-[13px] font-extrabold text-[#0B2A63]">
            Upcoming Target
          </h2>
          <p className="mt-1 text-[9px] text-slate-400">
            Target yang akan jatuh tempo berikutnya.
          </p>

          <div className="mt-3 divide-y divide-slate-100">
            {upcomingTargets.length === 0 ? (
              <div className="flex min-h-[170px] items-center justify-center text-center text-[9px] text-slate-400">
                Tidak ada target mendatang.
              </div>
            ) : (
              upcomingTargets.map((item) => {
                const date = new Date(item.dueDate);

                return (
                  <div
                    key={`${item.id}-${item.dueDate}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-2.5"
                  >
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-blue-50">
                      <span className="text-[12px] font-extrabold text-blue-700">
                        {date.getDate()}
                      </span>
                      <span className="text-[7px] font-bold uppercase text-blue-500">
                        {new Intl.DateTimeFormat('id-ID', {
                          month: 'short',
                        }).format(date)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[8.5px] font-bold text-[#0B2A63]">
                        {item.subTaskName}
                      </p>
                      <p className="mt-0.5 truncate text-[7.5px] text-slate-400">
                        {item.programName}
                      </p>
                    </div>

                    <span className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[7px] font-semibold text-red-500">
                      {item.daysLeft === 0 ? 'Hari ini' : `Sisa ${item.daysLeft} hari`}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <button className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[8.5px] font-semibold text-blue-600">
            Lihat Kalender
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </article>
      </section>

      {/* RINGKASAN FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2 text-[8px] text-slate-400">
        <span>
          Data aktif: <strong className="text-slate-600">{selectedProgramName}</strong>
          {selectedTaskId !== 'ALL' && (
            <> · <strong className="text-slate-600">{selectedTaskName}</strong></>
          )}
        </span>
        <span>
          {filteredStats.totalPrograms} program · {filteredStats.totalTasks} task · {filteredStats.totalSubTasks} sub-task
        </span>
      </div>
    </div>
  );
}