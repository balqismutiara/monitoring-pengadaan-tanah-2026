import React from 'react';
import { Program, DashboardStats, PICProgress } from '../types';
import { 
  calculateProgramMetrics, 
  calculateTaskMetrics, 
  isSubTaskOverdue, 
  calculatePicProgress,
  CURRENT_DATE_STR 
} from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { AlertTriangle, Clock, Users, Percent, CheckCircle, Flame, Calendar, MapPin } from 'lucide-react';

interface MonitoringDashboardProps {
  programs: Program[];
  stats: DashboardStats;
}

export function MonitoringDashboard({ programs, stats }: MonitoringDashboardProps) {
  // 1. Program progress data
  const programProgressData = programs.map(p => {
    const metrics = calculateProgramMetrics(p);
    return {
      name: p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name,
      fullName: p.name,
      Progress: metrics.progress,
      Status: metrics.isAtRisk ? 'Beresiko' : 'Aman'
    };
  });

  // 2. Status Task count (Donut)
  let doneCount = 0;
  let wipCount = 0;
  let delayedCount = 0;

  programs.forEach(p => {
    p.tasks.forEach(t => {
      t.subTasks.forEach(sub => {
        if (sub.status === 'DONE') doneCount++;
        else if (sub.status === 'WIP') wipCount++;
        else if (sub.status === 'DELAYED') delayedCount++;
      });
    });
  });

  const statusPieData = [
    { name: 'Selesai (DONE)', value: doneCount, color: '#10B981' }, // emerald-500
    { name: 'Sedang Proses (WIP)', value: wipCount, color: '#3B82F6' }, // blue-500
    { name: 'Terlambat (DELAYED)', value: delayedCount, color: '#EF4444' } // rose-500
  ].filter(d => d.value > 0);

  // 3. Overdue Tasks mapping
  interface FlatOverdueItem {
    id: string;
    programName: string;
    taskName: string;
    subTaskName: string;
    pic: string;
    dueDate: string;
    delayDays: number;
    notes?: string;
  }

  const overdueList: FlatOverdueItem[] = [];
  programs.forEach(p => {
    p.tasks.forEach(t => {
      t.subTasks.forEach(sub => {
        if (isSubTaskOverdue(sub)) {
          const dueDateTime = new Date(sub.dueDate).getTime();
          const currTime = new Date(CURRENT_DATE_STR).getTime();
          const diffDays = Math.max(1, Math.round((currTime - dueDateTime) / (1000 * 60 * 60 * 24)));
          
          overdueList.push({
            id: sub.id,
            programName: p.name,
            taskName: t.name,
            subTaskName: sub.name,
            pic: sub.pic,
            dueDate: sub.dueDate,
            delayDays: diffDays,
            notes: sub.notes
          });
        }
      });
    });
  });

  // Sort by delayDays descending
  overdueList.sort((a, b) => b.delayDays - a.delayDays);

  // 4. Progress per PIC
  const picProgressRaw = calculatePicProgress(programs);
  const picChartData = picProgressRaw.map(pic => ({
    name: pic.pic,
    'Progres (%)': pic.progress,
    'Total Tugas': pic.totalTasks,
    'Selesai': pic.completedTasks
  }));

  // 5. Timeline of penyelesaian
  // Gather all items to plot milestones on an interactive timeline
  interface MilestoneItem {
    id: string;
    name: string;
    programName: string;
    dueDate: string;
    status: 'DONE' | 'WIP' | 'DELAYED';
    pic: string;
    progress: number;
  }

  const milestones: MilestoneItem[] = [];
  programs.forEach(p => {
    p.tasks.forEach(t => {
      t.subTasks.forEach(sub => {
        milestones.push({
          id: sub.id,
          name: sub.name,
          programName: p.name,
          dueDate: sub.dueDate,
          status: sub.status,
          pic: sub.pic,
          progress: sub.progress
        });
      });
    });
  });

  // Sort by dueDate ascending
  milestones.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div id="dashboard-monitoring" className="space-y-6">
      
      {/* Visualisasi Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Row 1, Chart 1: Progres Tiap Program Kerja */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Progres Tiap Program Kerja</h3>
            <p className="text-xs text-slate-500 mb-4">Grafik tingkat realisasi keseluruhan dari setiap klaster program pengadaan lahan utama.</p>
          </div>
          <div className="h-[280px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={programProgressData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '10px', color: '#FFF' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="Progress" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={40}>
                  {programProgressData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.Status === 'Beresiko' ? '#F59E0B' : '#10B981'} 
                    />
                  ))}
                </Bar>
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-slate-500">Persentase Target Selesai</span>}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 justify-center text-xs mt-3 pt-2 text-slate-500 border-t border-slate-100 dark:border-slate-800/60">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Aman (Progres Bagus)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> Beresiko (Ada Keterlambatan)</span>
          </div>
        </div>

        {/* Row 1, Chart 2: Status Pekerjaan (Sub-Task Status Pie Chart) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Distribusi Status Sub-Task</h3>
            <p className="text-xs text-slate-500 mb-4">Rasio pembagian status dari total seluruh sub-task pengadaan tanah yang sedang dimonitor.</p>
          </div>
          <div className="h-[280px] w-full flex items-center justify-center">
            <div className="w-2/3 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '10px', color: '#FFF' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend to side */}
            <div className="w-1/3 flex flex-col justify-center gap-3">
              {statusPieData.map((entry, index) => (
                <div key={index} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">{entry.value}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium pl-5">{entry.name}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-800/60">
            Total Sub-Task Kerja: {stats.totalSubTasks} item yang didata
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Row 2, Chart 3: Progres per PIC (Horizontal Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Realisasi & Efisiensi Progres per PIC</h3>
            <p className="text-xs text-slate-500 mb-4">Rata-rata penyelesaian sub-task berdasarkan individu pemegang tanggung jawab utama.</p>
          </div>
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={picChartData}
                margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} tickLine={false} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '10px', color: '#FFF' }}
                />
                <Bar dataKey="Progres (%)" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-800/60">
            *PIC dengan progres tinggi menunjukkan kapabilitas operasional lahan yang optimal.
          </div>
        </div>

        {/* Row 2, List: Task Terlambat (Overdue Tasks) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-red-600 dark:text-rose-400 mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Overdue & Terhambat Lahan ({overdueList.length})
            </h3>
            <p className="text-xs text-slate-500">Daftar item pekerjaan yang telah melewati target tenggat waktu penyelesaian.</p>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 max-h-[280px] space-y-3 scrollbar-thin">
            {overdueList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
                <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-emerald-600">Luar Biasa!</p>
                <p className="text-[11px] text-slate-400">Tidak ada sub-task yang terlambat.</p>
              </div>
            ) : (
              overdueList.map(item => (
                <div key={item.id} className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 space-y-1.5 transition-all hover:border-rose-300">
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-2">{item.subTaskName}</span>
                    <span className="shrink-0 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                      +{item.delayDays} Hari
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5 font-medium">
                    <p className="text-slate-400 truncate">Prog: {item.programName}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Users className="w-3 h-3 inline" /> PIC: {item.pic}
                    </p>
                    <p className="text-slate-400">Target: {item.dueDate}</p>
                  </div>
                  {item.notes && (
                    <p className="text-[10px] bg-white/60 dark:bg-slate-900/60 p-1.5 rounded text-amber-800 dark:text-amber-400 border border-amber-100/30 leading-normal">
                      🚧 {item.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          <p className="text-[11.5px] text-center text-slate-400 italic pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/60">
            Dihitung dari basis target tanggal valid: {CURRENT_DATE_STR}
          </p>
        </div>

      </div>

      {/* Row 3: Timeline Penyelesaian Pengadaan Lahan (Roadmap Timeline) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            Timeline Alur & Milestones 2026
          </h3>
          <p className="text-xs text-slate-500">Timeline kronologis penyelesaian setiap sub-task berdasarkan tanggal jatuh tempo target tahun 2026.</p>
        </div>

        {/* Dynamic Horizontal Chronology Line */}
        <div className="overflow-x-auto pb-4 scrollbar-thin">
          <div className="min-w-[1000px] relative px-4 pt-4">
            {/* The line */}
            <div className="absolute top-[32px] left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 rounded" />

            <div className="flex justify-between items-start">
              {milestones.filter((_, idx) => idx % 2 === 0).slice(0, 7).map((milestone) => {
                const isOver = milestone.dueDate < CURRENT_DATE_STR && milestone.status !== 'DONE';
                return (
                  <div key={milestone.id} className="relative flex flex-col items-center w-36 text-center group">
                    {/* Circle Indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-300 ${
                      milestone.status === 'DONE' 
                        ? 'bg-emerald-500 border-white dark:border-slate-900 text-white' 
                        : isOver 
                        ? 'bg-red-500 border-white dark:border-slate-900 text-white animate-pulse' 
                        : 'bg-blue-500 border-white dark:border-slate-900 text-white'
                    }`}>
                      <span className="text-[9px] font-mono leading-none font-bold">
                        {milestone.status === 'DONE' ? '✓' : isOver ? '!' : '⏳'}
                      </span>
                    </div>

                    {/* Date label */}
                    <span className="mt-2 font-mono text-[10px] font-semibold text-slate-500">
                      {milestone.dueDate}
                    </span>

                    {/* Content Box */}
                    <div className="mt-1 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-left w-full space-y-1">
                      <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2" title={milestone.name}>
                        {milestone.name}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">{milestone.programName.split(" ").slice(2).join(" ")}</p>
                      <div className="flex justify-between items-center text-[8.5px] pt-1 border-t border-slate-200/50 dark:border-slate-800">
                        <span className="text-slate-500 truncate max-w-[50px]">{milestone.pic.split(" ")[0]}</span>
                        <span className="font-semibold text-emerald-600">{milestone.progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 leading-6 mt-3 flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
          💡 <span>**Informasi Progres**: Garis kronologis di atas menampilkan rencana sebaran penuntasan. Status lingkaran merah (!) merupakan indikasi darurat overdue, lingkaran hijau (✓) merepresentasikan pencapaian sasaran pengadaan yang berhasil, dan lingkaran biru adalah proses berlanjut.</span>
        </div>
      </div>

    </div>
  );
}
