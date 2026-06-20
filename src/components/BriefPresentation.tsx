import React, { useState } from 'react';
import { DashboardStats } from '../types';
import { 
  Presentation, ChevronLeft, ChevronRight, Play, Eye,
  FileText, ShieldAlert, Sparkles, TrendingUp, AlertCircle, RefreshCw 
} from 'lucide-react';

interface BriefPresentationProps {
  stats: DashboardStats;
}

export function BriefPresentation({ stats }: BriefPresentationProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slidesData = [
    {
      title: "Ringkasan Kondisi Pengadaan Lahan Saat Ini",
      subtitle: "Status Realisasi Aggregat Program Kerja Tahun Buku 2026",
      icon: TrendingUp,
      color: "from-blue-600 to-indigo-700",
      content: (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm space-y-1 text-white">
              <span className="text-xs uppercase text-blue-200 block font-semibold">Progres Konsolidasi</span>
              <p className="text-4xl font-black font-mono">{stats.overallProgress}%</p>
              <span className="text-[10px] text-blue-100 block">Akumulasi penyelesaian program pengadaan</span>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm space-y-1 text-white">
              <span className="text-xs uppercase text-rose-200 block font-semibold text-rose-300">Total Deviasi / Terlambat</span>
              <p className="text-4xl font-black font-mono text-rose-300">{stats.overdueTasksCount} Item</p>
              <span className="text-[10px] text-rose-100 block">Sub-task melewati target waktu</span>
            </div>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-100 text-xs leading-relaxed">
            🌿 <strong>Status Kinerja Regional:</strong> Pengadaan Lahan Terminal Kijing menunjukkan kemajuan pesat di area pemindahan makam ahli waris. Namun, pilar sertifikasi keseluruhan menghadapi hambatan birokrasi notaris yang memerlukan percepatan administratif.
          </div>
        </div>
      )
    },
    {
      title: "Temuan Utama Lapangan (Key Findings)",
      subtitle: "Identifikasi Faktor Utama Hambatan Operasional",
      icon: FileText,
      color: "from-emerald-600 to-teal-700",
      content: (
        <div className="space-y-4 pt-2">
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white/10 p-3 rounded-xl border border-white/5 text-white">
              <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
              <p className="text-xs">
                <strong>Hambatan Vendor Notaris:</strong> Penunjukan Notaris/PPAT mitra terlambat akibat sirkuler internal berbelit, menahan pencairan PNBP Sertipikasi.
              </p>
            </div>
            <div className="flex items-start gap-3 bg-white/10 p-3 rounded-xl border border-white/5 text-white">
              <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
              <p className="text-xs">
                <strong>Ijin Prinsip TNI AL (BMN):</strong> Proses penerbitan ijin prinsip tukar menukar tanah pengganti TNI AL di Merauke & Pontianak mengalami keterlambatan birokrasi pertahanan.
              </p>
            </div>
            <div className="flex items-start gap-3 bg-white/10 p-3 rounded-xl border border-white/5 text-white">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
              <p className="text-xs">
                <strong>Konsinyasi Valid:</strong> Pembayaran UGR melalui PN Jakarta Utara berjalan aman dan memiliki kekuatan hukum tetap untuk pembebasan NPEA.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Eskalasi Profil Risiko (Risks Analysis)",
      subtitle: "Dampak Terhadap Garis Waktu Konstruksi Fisik",
      icon: ShieldAlert,
      color: "from-amber-600 to-red-600",
      content: (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-red-950/40 p-3.5 rounded-xl border border-red-900/40 text-rose-200 text-xs space-y-1">
              <strong className="text-sm block text-red-400">🚨 Risiko Hukum</strong>
              <p className="text-[11px] leading-relaxed">Potensi somasi atau sengketa lahan sisa pemecahan sisa bidang sertipikat jika tidak dikoordinasikan intensif dengan Kantah BPN DKI Jakarta.</p>
            </div>
            <div className="bg-amber-950/40 p-3.5 rounded-xl border border-amber-900/40 text-amber-200 text-xs space-y-1">
              <strong className="text-sm block text-amber-400">⚠️ Risiko Jadwal</strong>
              <p className="text-[11px] leading-relaxed">Pembangunan fisik terminal & pelabuhan regional (Sorong, Batang, MNP) terancam mundur 3-4 bulan akibat kelambatan pelepasan hak PTPN dan penyerahan aset desa.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Rekomendasi Lanjutan (Action Items)",
      subtitle: "Langkah Solutif & Koordinatif Tim Lahan Regional",
      icon: Sparkles,
      color: "from-indigo-600 to-purple-700",
      content: (
        <div className="space-y-4 pt-2 text-white">
          <ul className="space-y-3 text-xs leading-relaxed">
            <li className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-300" />
              <span><strong>Eskalasi Direksi:</strong> Agenda percepatan koordinasi korporat untuk memfasilitasi 'beauty contest' Notaris regional terpilih secara langsung dalam kurun waktu 7 hari kerja.</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-300" />
              <span><strong>Penerbitan SK Penlok:</strong> Melakukan follow-up intensif ke Gubernur DKI Jakarta terkait draf permohonan SK penlok yang tertunda.</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-300" />
              <span><strong>Rapat Koordinasi Bersama:</strong> Penyelenggaraan forum triwulanan melibatkan Satgas B, Kepala BPN, Pemerintah Kabupaten Mempawah, dan Kejati untuk mempercepat land-clearing Kijing.</span>
            </li>
          </ul>
        </div>
      )
    }
  ];

  const handleNext = () => {
    setCurrentSlide(prev => (prev + 1) % slidesData.length);
  };

  const handlePrev = () => {
    setCurrentSlide(prev => (prev - 1 + slidesData.length) % slidesData.length);
  };

  const IconComponent = slidesData[currentSlide].icon;

  return (
    <div id="brief-presentation" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Slide Index / Selection Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Presentation className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Navigasi Slide</span>
          </div>
          <div className="space-y-2">
            {slidesData.map((slide, idx) => {
              const SlideIcon = slide.icon;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer ${
                    currentSlide === idx 
                      ? 'bg-slate-50 border border-indigo-200 text-indigo-700 dark:bg-slate-800 dark:border-indigo-800 dark:text-indigo-300' 
                      : 'hover:bg-slate-50 border border-transparent text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${currentSlide === idx ? 'bg-indigo-100 dark:bg-indigo-950/35' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <SlideIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11.5px] font-bold leading-normal truncate max-w-[130px]">{slide.title}</p>
                    <p className="text-[9.5px] text-slate-400">Slide {idx + 1} dari 4</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6 text-[11px] text-slate-400 leading-normal">
          💡 Gunakan tombol panah di kanan slide untuk transisi cepat atau cetak presentasi ini untuk rapat Direksi Pengadaaan Lahan.
        </div>
      </div>

      {/* Main Slide Screen Container */}
      <div className="lg:col-span-3">
        <div className={`rounded-3xl bg-gradient-to-br ${slidesData[currentSlide].color} p-8 text-white shadow-xl min-h-[420px] flex flex-col justify-between relative overflow-hidden transition-all duration-500 transform`}>
          
          {/* Subtle design circles in background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

          {/* Slide Header */}
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-200">
                LAPORAN EKSEKUTIF PENGADAAN TANAH DEPARTEMEN ASET 2026
              </span>
            </div>
            
            <div className="pt-4 space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                {slidesData[currentSlide].title}
              </h2>
              <p className="text-slate-100 text-sm md:text-base font-medium">
                {slidesData[currentSlide].subtitle}
              </p>
            </div>
          </div>

          {/* Slide Content Box */}
          <div className="my-6 z-10 flex-1 flex flex-col justify-center">
            {slidesData[currentSlide].content}
          </div>

          {/* Slide Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-white/10 z-10">
            <div className="flex items-center gap-1 text-[11px] text-slate-200 font-mono">
              <Play className="w-3 h-3 text-red-100 animate-pulse fill-red-100 inline" /> 
              <span>PT PELABUHAN INDONESIA (PERSERO) • JUN 2026</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                title="Slide Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold font-mono text-slate-100 bg-white/10 px-3 py-1 rounded-full">
                {currentSlide + 1} / {slidesData.length}
              </span>
              <button
                onClick={handleNext}
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                title="Slide Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
