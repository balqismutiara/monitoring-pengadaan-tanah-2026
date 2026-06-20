import React, { useState } from 'react';
import { Program, SubTask } from '../types';
import * as XLSX from 'xlsx';
import { Download, Plus, Trash2, Edit2, CheckCircle2, RotateCcw, AlertCircle, Save } from 'lucide-react';

interface ExcelManagerProps {
  programs: Program[];
  setPrograms: React.Dispatch<React.SetStateAction<Program[]>>;
}

interface FlatRow {
  rowId: string; // programId - taskId - subTaskId
  programId: string;
  programName: string;
  taskId: string;
  taskName: string;
  taskType: string;
  subTaskId: string;
  subTaskName: string;
  pic: string;
  status: 'DONE' | 'WIP' | 'DELAYED';
  progress: number;
  startDate: string;
  dueDate: string;
  notes: string;
  // Custom user-defined headers
  priority: 'High' | 'Medium' | 'Low';
  weight: number;
  budgetAllocated: string;
}

export function ExcelManager({ programs, setPrograms }: ExcelManagerProps) {
  // Flatten programs for the table display
  const getFlatRows = (): FlatRow[] => {
    const rows: FlatRow[] = [];
    programs.forEach(p => {
      p.tasks.forEach(t => {
        t.subTasks.forEach(s => {
          rows.push({
            rowId: `${p.id}-${t.id}-${s.id}`,
            programId: p.id,
            programName: p.name,
            taskId: t.id,
            taskName: t.name,
            taskType: t.type,
            subTaskId: s.id,
            subTaskName: s.name,
            pic: s.pic,
            status: s.status,
            progress: s.progress,
            startDate: s.startDate,
            dueDate: s.dueDate,
            notes: s.notes || '',
            priority: s.id.charCodeAt(0) % 3 === 0 ? 'High' : s.id.charCodeAt(0) % 3 === 1 ? 'Medium' : 'Low',
            weight: 10,
            budgetAllocated: `Rp ${(100 + (s.id.charCodeAt(0) % 5) * 50)} Jt`
          });
        });
      });
    });
    return rows;
  };

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  // Custom columns togglers / additional header additions
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; label: string; visible: boolean }>>([
    { key: 'programName', label: 'Program Kerja', visible: true },
    { key: 'taskName', label: 'Task List (RKM/Non)', visible: true },
    { key: 'subTaskName', label: 'Sub Task', visible: true },
    { key: 'pic', label: 'PIC (PJ)', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'progress', label: 'Progress %', visible: true },
    { key: 'startDate', label: 'Tgl Mulai', visible: true },
    { key: 'dueDate', label: 'Tgl Target', visible: true },
    { key: 'priority', label: 'Prioritas (Custom Header)', visible: true },
    { key: 'weight', label: 'Bobot % (Custom Header)', visible: true },
    { key: 'budgetAllocated', label: 'Anggaran (Custom Header)', visible: true },
    { key: 'notes', label: 'Hambatan / Keterangan', visible: true },
  ]);

  const [newHeaderName, setNewHeaderName] = useState('');
  const [newHeaderVal, setNewHeaderVal] = useState('');

  // Editing state for direct cell modification
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<any>('');

  const rows = getFlatRows();

  // Search filter
  const filteredRows = rows.filter(r => {
    const matchesSearch = 
      r.programName.toLowerCase().includes(filterText.toLowerCase()) ||
      r.taskName.toLowerCase().includes(filterText.toLowerCase()) ||
      r.subTaskName.toLowerCase().includes(filterText.toLowerCase()) ||
      r.pic.toLowerCase().includes(filterText.toLowerCase()) ||
      r.notes.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Handle cell saving
  const handleSaveCell = (rowId: string, programId: string, taskId: string, subTaskId: string, field: string, val: any) => {
    setPrograms(prev => {
      return prev.map(p => {
        if (p.id !== programId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              subTasks: t.subTasks.map(sub => {
                if (sub.id !== subTaskId) return sub;
                
                let updatedSub = { ...sub };
                if (field === 'pic') updatedSub.pic = val;
                if (field === 'notes') updatedSub.notes = val;
                if (field === 'progress') {
                  const num = isNaN(Number(val)) ? 0 : Math.min(100, Math.max(0, Number(val)));
                  updatedSub.progress = num;
                  if (num === 100) {
                    updatedSub.status = 'DONE';
                  } else if (num > 0 && updatedSub.status === 'DONE') {
                    updatedSub.status = 'WIP';
                  }
                }
                if (field === 'startDate') updatedSub.startDate = val;
                if (field === 'dueDate') updatedSub.dueDate = val;
                if (field === 'status') {
                  updatedSub.status = val;
                  if (val === 'DONE') updatedSub.progress = 100;
                  else if (val === 'DELAYED' && updatedSub.progress === 100) updatedSub.progress = 0;
                }
                
                return updatedSub;
              })
            };
          })
        };
      });
    });
    setEditingCell(null);
  };

  const startEditing = (rowId: string, field: string, value: any) => {
    setEditingCell({ rowId, field });
    setEditingValue(value);
  };

  // Add a newly customized header parameter
  const handleAddHeader = () => {
    if (!newHeaderName) return;
    setCustomHeaders(prev => [
      ...prev,
      {
        key: newHeaderName.toLowerCase().replace(/\s+/g, '_'),
        label: newHeaderName,
        visible: true
      }
    ]);
    setNewHeaderName('');
  };

  // Export to standard Excel (.xlsx) using SheetJS
  const handleExportXLSX = () => {
    // Generate JSON containing visible and customized headers
    const exportData = filteredRows.map(row => {
      const obj: { [key: string]: any } = {};
      customHeaders.forEach(head => {
        if (head.visible) {
          obj[head.label] = (row as any)[head.key];
        }
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monitoring Lahan 2026");

    // Auto fit column widths nicely
    const maxLens = customHeaders.map(h => h.label.length);
    exportData.forEach(row => {
      customHeaders.forEach((h, i) => {
        if (h.visible) {
          const valStr = String(row[h.label] || '');
          if (valStr.length > maxLens[i]) {
            maxLens[i] = valStr.length;
          }
        }
      });
    });
    worksheet["!cols"] = maxLens.filter((_, idx) => customHeaders[idx].visible).map(len => ({ wch: Math.min(45, len + 3) }));

    XLSX.writeFile(workbook, "Data_Monitoring_Pengadaan_Tanah_2026.xlsx");
  };

  return (
    <div className="space-y-6">
      {/* Excel Header Control Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Pengaturan Kolom & Custom Header Excel</h3>
            <p className="text-sm text-slate-500">Sesuaikan header kolom Excel untuk data monitoring Anda sebelum melakukan pencetakan atau ekspor file.</p>
          </div>
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-2xl transform active:scale-95 transition-all text-sm cursor-pointer shadow-sm shadow-emerald-100 dark:shadow-none"
          >
            <Download className="w-4 h-4" />
            Unduh Excel (.xlsx)
          </button>
        </div>

        {/* Custom headers toggles */}
        <div className="flex flex-wrap gap-2 pt-2">
          {customHeaders.map((head, idx) => (
            <button
              key={head.key}
              onClick={() => {
                setCustomHeaders(prev => prev.map((h, i) => i === idx ? { ...h, visible: !h.visible } : h));
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                head.visible
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40'
                  : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700/60'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${head.visible ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {head.label}
            </button>
          ))}
        </div>

        {/* Add custom header tool */}
        <div className="flex items-center gap-3 max-w-md pt-2">
          <input
            type="text"
            placeholder="Tambah Kolom/Header Baru..."
            value={newHeaderName}
            onChange={(e) => setNewHeaderName(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
          />
          <button
            onClick={handleAddHeader}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
      </div>

      {/* Spreadsheet grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Toolbar spreadsheet */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder="Cari program, task, sub-task, notes, PIC..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:max-w-xs text-slate-700 dark:text-slate-100"
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600 dark:text-slate-300"
            >
              <option value="ALL">Semua Status</option>
              <option value="DONE">Selesai (DONE)</option>
              <option value="WIP">Sedang Berjalan (WIP)</option>
              <option value="DELAYED">Terlambat (DELAYED)</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 flex items-center font-mono">
            Peta Kolom Aktif: {customHeaders.filter(h => h.visible).length} Terpilih | Total {filteredRows.length} Rows
          </p>
        </div>

        {/* Big styled Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                {customHeaders.map(head => head.visible && (
                  <th key={head.key} className="px-4 py-3 min-w-[120px] font-semibold border-r border-slate-100 dark:border-slate-800">
                    {head.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={customHeaders.filter(h => h.visible).length} className="px-6 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Data tidak ditemukan. Silakan sesuaikan pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.rowId} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                    {customHeaders.map(head => {
                      if (!head.visible) return null;

                      // Check is this cell currently being edited
                      const isEditing = editingCell?.rowId === row.rowId && editingCell?.field === head.key;

                      let cellContent;

                      if (isEditing) {
                        if (head.key === 'status') {
                          cellContent = (
                            <select
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveCell(row.rowId, row.programId, row.taskId, row.subTaskId, 'status', editingValue)}
                              autoFocus
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded text-xs focus:outline-none"
                            >
                              <option value="DONE">DONE ✅</option>
                              <option value="WIP">WIP ⏳</option>
                              <option value="DELAYED">DELAYED ❌</option>
                            </select>
                          );
                        } else if (head.key === 'progress') {
                          cellContent = (
                            <input
                              type="number"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveCell(row.rowId, row.programId, row.taskId, row.subTaskId, 'progress', editingValue)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveCell(row.rowId, row.programId, row.taskId, row.subTaskId, 'progress', editingValue);
                              }}
                              autoFocus
                              min="0"
                              max="100"
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded font-mono text-xs focus:outline-none"
                            />
                          );
                        } else if (head.key === 'startDate' || head.key === 'dueDate') {
                          cellContent = (
                            <input
                              type="date"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveCell(row.rowId, row.programId, row.taskId, row.subTaskId, head.key, editingValue)}
                              autoFocus
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2   py-1 rounded text-xs focus:outline-none"
                            />
                          );
                        } else {
                          cellContent = (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveCell(row.rowId, row.programId, row.taskId, row.subTaskId, head.key, editingValue)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveCell(row.rowId, row.programId, row.taskId, row.subTaskId, head.key, editingValue);
                              }}
                              autoFocus
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded text-xs focus:outline-none"
                            />
                          );
                        }
                      } else {
                        // Render standard read values elegantly
                        const val = (row as any)[head.key];
                        if (head.key === 'status') {
                          cellContent = (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${
                              val === 'DONE' 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : val === 'WIP' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                val === 'DONE' ? 'bg-emerald-500' : val === 'WIP' ? 'bg-blue-500' : 'bg-rose-500'
                              }`} />
                              {val === 'DONE' ? 'DONE' : val === 'WIP' ? 'WIP' : 'DELAYED'}
                            </span>
                          );
                        } else if (head.key === 'progress') {
                          cellContent = (
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${val}%` }} />
                              </div>
                              <span className="font-mono text-xs text-slate-500">{val}%</span>
                            </div>
                          );
                        } else if (head.key === 'priority') {
                          cellContent = (
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                              val === 'High' 
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30' 
                                : val === 'Medium' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30' 
                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}>
                              {val}
                            </span>
                          );
                        } else if (head.key === 'notes') {
                          cellContent = (
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] block" title={val}>
                              {val || '-'}
                            </span>
                          );
                        } else if (head.key === 'startDate' || head.key === 'dueDate') {
                          cellContent = <span className="font-mono text-xs">{val}</span>;
                        } else if (head.key === 'programName' || head.key === 'taskName') {
                          cellContent = <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[170px] block">{val}</span>;
                        } else {
                          cellContent = <span className="text-slate-700 dark:text-slate-300">{val}</span>;
                        }
                      }

                      return (
                        <td
                          key={head.key}
                          onClick={() => {
                            if (!isEditing && ['pic', 'notes', 'progress', 'startDate', 'dueDate', 'status'].includes(head.key)) {
                              startEditing(row.rowId, head.key, (row as any)[head.key]);
                            }
                          }}
                          className="px-4 py-3 align-middle border-r border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 bg-clip-padding group/cell relative"
                        >
                          {cellContent}
                          {!isEditing && ['pic', 'notes', 'progress', 'startDate', 'dueDate', 'status'].includes(head.key) && (
                            <span className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 text-[10px] text-slate-400 bg-white dark:bg-slate-900 p-0.5 rounded shadow pointer-events-none">
                              Klik Edit
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          💡 **Panduan Spreadsheet**: Klik dua kali atau klik sekali pada sel berkolase (Status, Progress, PIC, Tgl Target, Keterangan) untuk mengedit nilainya langsung. Semua statistik di dashboard akan tersinkronisasi secara real-time.
        </div>
      </div>
    </div>
  );
}
