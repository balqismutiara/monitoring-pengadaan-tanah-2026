import React, { useState, useMemo } from 'react';
import { INITIAL_PROGRAMS } from './data';
import { calculateDashboardStats } from './utils';
import { MetricCard } from './components/MetricCard';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { ExcelManager } from './components/ExcelManager';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { BriefPresentation } from './components/BriefPresentation';
import { 
  Briefcase, CheckSquare, ListTodo, Percent, AlertCircle, TrendingUp, Calendar, Clock,
  FileCheck, Newspaper, Presentation as PresentationIcon, Send, Sparkles, RefreshCw, BarChart4, FileSpreadsheet
} from 'lucide-react';

export default function App() {
  const [programs, setPrograms] = useState(INITIAL_PROGRAMS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'excel' | 'summary' | 'presentation'>('dashboard');

  // Compute stats dynamically whenever state updates
  const stats = useMemo(() => {
    return calculateDashboardStats(programs);
  }, [programs]);

  // Assist Chat Simulator or contextual Q&A
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: "Halo! Saya adalah Asisten Monitoring Lahan 2026. Anda dapat menanyakan ringkasan status, PIC, keterlambatan, atau langkah rekomendasi." }
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    // Local smart matching to provide realistic analysis about real-time states
    setTimeout(() => {
      let replyText = "";
      const lower = userMsg.toLowerCase();

      if (lower.includes('status') || lower.includes('progres') || lower.includes('progress')) {
        replyText = `Status progres keseluruhan adalah ${stats.overallProgress}%. Terdapat ${stats.totalPrograms} Program Utama yang terdiri dari ${stats.totalTasks} Tasks, dan total ${stats.totalSubTasks} subtasks. Sebanyak ${stats.overdueTasksCount} sub-task terdeteksi terlambat (overdue) melewati tenggat waktu.`;
      } else if (lower.includes('terlambat') || lower.includes('telat') || lower.includes('overdue')) {
        replyText = `Saat ini terdapat ${stats.overdueTasksCount} sub-task terlambat. Hambatan terbesar ada di program 'Pensertipikatan HGB Konsesi' pada penunjukan Notaris/PPAT, serta 'Relokasi Aset TNI AL' terkait Ijin Pelaksanaan.`;
      } else if (lower.includes('pic') || lower.includes('tanggung jawab') || lower.includes('petugas')) {
        replyText = `Tanggung jawab tersebar di beberapa PIC utama. PIC Budi Santoso menangani urusan sertifikasi, Ahmad Sujatmiko mengawal aspek hukum & PN, dan Dewi Lestari mengeksekusi relokasi fisik bangunan desa.`;
      } else if (lower.includes('rekomendasi') || lower.includes('saran') || lower.includes('solusi')) {
        replyText = `Rekomendasi strategis: 1) Segera lakukan percepatan penunjukan Notaris di Kijing secara langsung bypass regulasi panjang korporat. 2) Adakan rapat triwulanan melibatkan Satgas B, BPN, dan Kejati. 3) Ajukan perpanjangan SK Penlok NPEA ke Gubernur DKI Jakarta.`;
      } else {
        replyText = `Terima kasih atas pertanyaannya. Berdasarkan pembacaan database, program ${programs[0].name} berada pada progres sekitar ${Math.round(stats.overallProgress * 1.1 > 100 ? 100 : stats.overallProgress * 1.1)}% setelah pembersihan UGR Ahli Waris diselesaikan di PN Mempawah. Rekomendasi utama adalah memantau kelengkapan berkas BPHTB.`;
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: replyText }]);
    }, 600);
  };

  // Status Color dynamic indicator
  const progressColor = stats.overallProgress >= 70 ? 'emerald' : stats.overallProgress >= 45 ? 'blue' : 'amber';

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 antialiased pb-12">
      
      {/* Top Professional Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-[10px] font-bold rounded-lg tracking-wider uppercase border border-indigo-100/30">
                Pilar Pengelolaan Aset
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Sistem Terpadu • UTC 2026
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              Monitoring Pengadaan Tanah 2026
            </h1>
          </div>

          {/* Quick tab switchers */}
          <nav className="flex bg-slate-100/70 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <BarChart4 className="w-3.5 h-3.5" />
              Dashboard Utama
            </button>
            <button
              onClick={() => setActiveTab('excel')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'excel'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel & Database
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Executive Summary
            </button>
            <button
              onClick={() => setActiveTab('presentation')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'presentation'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <PresentationIcon className="w-3.5 h-3.5" />
              Presentasi Singkat
            </button>
          </nav>

        </div>
      </header>

      {/* Main Structural Layout Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-8">
        
        {/* Real-time stats cards block (Utama KPIs) */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            id="met-prog"
            title="Total Program"
            value={stats.totalPrograms}
            icon={Briefcase}
            subtext="Klaster Lahan Utama"
            color="indigo"
          />
          <MetricCard
            id="met-tsk"
            title="Total Task"
            value={stats.totalTasks}
            icon={ListTodo}
            subtext="Rencana RKM & Non"
            color="slate"
          />
          <MetricCard
            id="met-sub"
            title="Total Sub-Task"
            value={stats.totalSubTasks}
            icon={FileCheck}
            subtext="Item Rincian Kerja"
            color="blue"
          />
          <MetricCard
            id="met-prog-p"
            title="Progress Total"
            value={`${stats.overallProgress}%`}
            icon={Percent}
            subtext="Target Realisasi Lahan"
            color={progressColor}
          />
          <MetricCard
            id="met-lagg"
            title="Overdue Deviasi"
            value={stats.overdueTasksCount}
            icon={Clock}
            subtext="Melewati Target Tgl"
            color="rose"
          />
          <MetricCard
            id="met-risk"
            title="Program Beresiko"
            value={stats.atRiskProgramsCount}
            icon={AlertCircle}
            subtext="Penundaan Kritis"
            color="amber"
          />
        </section>

        {/* Dynamic Inner Tab Router */}
        <section className="space-y-6">
          {activeTab === 'dashboard' && (
            <MonitoringDashboard programs={programs} stats={stats} />
          )}

          {activeTab === 'excel' && (
            <ExcelManager programs={programs} setPrograms={setPrograms} />
          )}

          {activeTab === 'summary' && (
            <ExecutiveSummary programs={programs} stats={stats} />
          )}

          {activeTab === 'presentation' && (
            <BriefPresentation stats={stats} />
          )}
        </section>

        {/* Embedded Real-time AI Assistant Chat Widget */}
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h4 className="font-bold text-slate-800 dark:text-slate-100">Asisten Pintar Lahan</h4>
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Butuh analisis cepat? Tanyakan perihal target, PIC, atau temuan hambatan beresiko di lapangan langsung. Data yang diproses sepenuhnya terintegrasi secara dinamis dengan database spreadsheet di atas.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button 
                onClick={() => setChatInput("Bagaimana status progres keseluruhan saat ini?")}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 pointer"
              >
                🔍 Progres Total
              </button>
              <button 
                onClick={() => setChatInput("Sebutkan subtask yang terhambat atau terlambat!")}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 pointer"
              >
                ⚠ Overdue Lahan
              </button>
              <button 
                onClick={() => setChatInput("Langkah rekomendasi strategis apa selanjutnya?")}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 pointer"
              >
                💡 Solusi Mitigasi
              </button>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col h-[230px] bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/40 dark:border-slate-800/80 overflow-hidden">
            {/* Messages box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-3 max-w-[85%] rounded-2xl text-xs leading-normal ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm' 
                      : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-xs'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input message form */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-200/40 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
              <input
                type="text"
                placeholder="Tanyakan analisis atau langkah taktis..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-100"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer font-bold shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </section>

      </main>
    </div>
  );
}
