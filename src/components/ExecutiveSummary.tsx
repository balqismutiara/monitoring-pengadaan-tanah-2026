import React from 'react';
import { Program, DashboardStats } from '../types';
import { calculateProgramMetrics, isSubTaskOverdue, CURRENT_DATE_STR } from '../utils';
import { FileText, Award, AlertTriangle, ShieldCheck, Zap, HelpCircle } from 'lucide-react';

interface ExecutiveSummaryProps {
  programs: Program[];
  stats: DashboardStats;
}

export function ExecutiveSummary({ programs, stats }: ExecutiveSummaryProps) {
  // Analytical processing for Dynamic Insights
  const totalSubTasksCount = stats.totalSubTasks;
  const overdueCount = stats.overdueTasksCount;
  
  // Find which specific subtasks are delaying the most
  const criticalDelays: string[] = [];
  programs.forEach(p => {
    p.tasks.forEach(t => {
      t.subTasks.forEach(sub => {
        if (isSubTaskOverdue(sub) && sub.status === 'DELAYED') {
          criticalDelays.push(`${p.name} - ${sub.name}`);
        }
      });
    });
  });

  // Calculate some risk ratings
  let statusVibe = "Stabil Terkendali";
  let statusColor = "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30";
  let statusDescription = "Sebagian besar target Rencana Kerja Monitoring (RKM) berjalan sesuai timeline utama, dengan deviasi minor pada pengurusan administrasi kepemilikan.";

  if (stats.atRiskProgramsCount >= 2) {
    statusVibe = "Peringatan Risiko Tinggi";
    statusColor = "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30";
    statusDescription = "Ditemukan hambatan struktural kritis berganda pada pilar persertipikatan HGB Konsesi dan Relokasi TNI AL yang memerlukan eskalasi pimpinan.";
  } else if (stats.atRiskProgramsCount === 1 || overdueCount > 2) {
    statusVibe = "Perhatian Khusus (Awas)";
    statusColor = "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30";
    statusDescription = "Beberapa tonggak kerja mengalami jeda waktu penyelesaian. Pemantauan ketat diperlukan pada sub-kontrak dan penunjukan Notaris.";
  }

  return (
    <div id="executive-summary" className="space-y-6">
      
      {/* Top Banner Status Ringkasan */}
      <div className={`p-6 rounded-3xl border ${statusColor} space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 shrink-0" />
            <h4 className="text-lg font-bold">Ringkasan Eksekutif Pengadaan Lahan 2026</h4>
          </div>
          <span className="px-4 py-1.5 rounded-2xl text-xs font-bold uppercase tracking-wider bg-white/80 dark:bg-slate-900 shadow-sm border border-inherit">
            Status: {statusVibe}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{statusDescription}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Dynamic SWOT Analysis of progress */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-500" />
            Capaian & Progres Utama (Achievements)
          </h4>
          <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Mempawah PN Clear:</strong> Pengambilan Uang Ganti Rugi (UGR) ahli waris untuk Pengadaan Tanah Terminal Kijing di PN Mempawah telah lunas diselesaikan 100%.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Kemitraan Kejati:</strong> Pendampingan hukum oleh Kejati Kalbar telah terjalin dinamis, mendukung pengosongan aset makam secara aman dan legal.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Tukar Guling BMN:</strong> Pembuatan Dokumen Perencanaan Pengadaan Tanah (DPPT) pengganti TNI AL (Tj Pinang, Pontianak, Merauke) dan Penilaian telah rampung disepakati.</span>
            </li>
          </ul>
        </div>

        {/* Bottleneck / Hambatan Utama */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Temuan Hambatan Utama (Bottlenecks)
          </h4>
          <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-rose-500 font-bold">!</span>
              <span><strong>Notaris & PPAT:</strong> Proses administrasi penunjukan Notaris/PPAT pengurusan pensertipikatan di Kijing dan NPEA mengalami keterlambatan yang berdampak pada pencairan PNBP.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-rose-500 font-bold">!</span>
              <span><strong>Ijin Prinsip TNI AL:</strong> Belum diperolehnya Ijin Pelaksanaan Tukar Menukar berakibat pada penundaan serah terima fisik aset pengganti bangunan TNI AL.</span>
            </li>
            {criticalDelays.length > 0 && (
              <li className="flex gap-2">
                <span className="text-rose-500 font-bold">!</span>
                <span><strong>Progres Terlambat:</strong> Ditemukan sebanyak <strong className="text-rose-600 font-mono">{criticalDelays.length}</strong> sub-task yang berstatus DELAYED (melewati tenggat waktu target).</span>
              </li>
            )}
          </ul>
        </div>

      </div>

      {/* Rencana Aksi Lanjutan dan Strategis */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-500" />
          Rencana Mitigasi & Tindak Lanjut Strategis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100">Solusi Birokrasi Notaris</h5>
            <p className="text-[11px] text-slate-500 leading-relaxed">Melakukan simplifikasi penunjukan langsung atau percepatan beauty contest Notaris/PPAT mitra regional minggu ini.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100">Eskalasi Kementerian AL</h5>
            <p className="text-[11px] text-slate-500 leading-relaxed">Mengirimkan surat eskalasi bersama direksi utama ke Kementerian Keuangan dan Mabes AL untuk ijin pelaksanaan.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100">Optimalisasi Pemecahan Lahan</h5>
            <p className="text-[11px] text-slate-500 leading-relaxed">Mengarahkan PIC Budi Santoso untuk mengawal harian pemecahan bidang oleh BPN Jakarta Utara secara formal berkelanjutan.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
