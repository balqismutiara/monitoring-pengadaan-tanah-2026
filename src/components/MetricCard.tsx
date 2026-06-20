import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext: string;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
}

export function MetricCard({ id, title, value, icon: Icon, subtext, color }: MetricCardProps) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40',
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
      text: 'text-blue-600 dark:text-blue-400',
      valColor: 'text-blue-900 dark:text-blue-50'
    },
    emerald: {
      bg: 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40',
      iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-400',
      valColor: 'text-emerald-900 dark:text-emerald-50'
    },
    amber: {
      bg: 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40',
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
      text: 'text-amber-600 dark:text-amber-400',
      valColor: 'text-amber-900 dark:text-amber-50'
    },
    rose: {
      bg: 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40',
      iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
      text: 'text-rose-600 dark:text-rose-400',
      valColor: 'text-rose-900 dark:text-rose-50'
    },
    indigo: {
      bg: 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40',
      iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
      text: 'text-indigo-600 dark:text-indigo-400',
      valColor: 'text-indigo-900 dark:text-indigo-50'
    },
    slate: {
      bg: 'bg-slate-50/60 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/40',
      iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      text: 'text-slate-600 dark:text-slate-400',
      valColor: 'text-slate-900 dark:text-slate-50'
    }
  };

  const currentColors = colorMap[color] || colorMap.slate;

  return (
    <div id={id} className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md ${currentColors.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${currentColors.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <h4 className={`text-2xl font-bold font-mono tracking-tight ${currentColors.valColor}`}>{value}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
      </div>
    </div>
  );
}
