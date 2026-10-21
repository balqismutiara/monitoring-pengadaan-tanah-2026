import React, { useState } from 'react';
import { Attachment, Program, SubTask } from '../types';
import * as XLSX from 'xlsx';
import { Download, Plus, Trash2, Edit2, CheckCircle2, RotateCcw, AlertCircle, Save, ExternalLink } from 'lucide-react';

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
  stage: string;
  taskCode: string;
  attachmentCount: number;
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
            stage: t.stage ?? 'C. Pelaksanaan',
            taskCode: t.taskCode ?? '—',
            attachmentCount: s.attachments?.length ?? 0,
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
    { key: 'stage', label: 'Tahapan Baku', visible: true },
    { key: 'taskName', label: 'Task List / Sub-Tahapan', visible: true },
    { key: 'subTaskName', label: 'Sub Task Operasional', visible: true },
    { key: 'pic', label: 'PIC (PJ)', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'progress', label: 'Progress %', visible: true },
    { key: 'startDate', label: 'Tgl Mulai', visible: true },
    { key: 'dueDate', label: 'Tgl Target', visible: true },
    { key: 'taskCode', label: 'Kode Task', visible: true },
    { key: 'attachmentCount', label: 'Lampiran Drive', visible: true },
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
  const [selectedRowForEdit, setSelectedRowForEdit] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('ALL');
  const [isEditMode, setIsEditMode] = useState(false);
  const [newItemMode, setNewItemMode] = useState<'program' | 'task' | 'subtask' | null>(null);
  const [newProgramName, setNewProgramName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskType, setNewTaskType] = useState<'RKM' | 'NON_RKM'>('RKM');
  const [newTaskStage, setNewTaskStage] = useState('C. Pelaksanaan');
  const [newTaskCode, setNewTaskCode] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newSubTaskName, setNewSubTaskName] = useState('');
  const [newSubTaskPic, setNewSubTaskPic] = useState('');
  const [newSubTaskStatus, setNewSubTaskStatus] = useState<'DONE' | 'WIP' | 'DELAYED'>('WIP');
  const [newSubTaskProgress, setNewSubTaskProgress] = useState(0);
  const [newSubTaskStartDate, setNewSubTaskStartDate] = useState('');
  const [newSubTaskDueDate, setNewSubTaskDueDate] = useState('');
  const [newSubTaskNotes, setNewSubTaskNotes] = useState('');
  const [attachmentForm, setAttachmentForm] = useState({ name: '', url: '', type: 'PDF' as Attachment['type'] });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState('');

  const rows = getFlatRows();
  const selectedFlatRow = rows.find(row => row.rowId === selectedRowForEdit) ?? null;
  const selectedProgramData = selectedFlatRow ? programs.find(program => program.id === selectedFlatRow.programId) : null;
  const selectedTaskData = selectedProgramData?.tasks.find(task => task.id === selectedFlatRow?.taskId);
  const selectedSubTaskData = selectedTaskData?.subTasks.find(subTask => subTask.id === selectedFlatRow?.subTaskId);
  const selectedAttachments = selectedSubTaskData?.attachments ?? [];

  const programOptions = [{ id: 'ALL', name: 'Semua Program' }, ...programs.map(p => ({ id: p.id, name: p.name }))];
  const selectedProgram = programs.find(p => p.id === selectedProgramId);
  const taskOptions = selectedProgram
    ? [{ id: 'ALL', name: 'Semua Task' }, ...selectedProgram.tasks.map(t => ({ id: t.id, name: t.name }))]
    : [{ id: 'ALL', name: 'Semua Task' }];
  const selectedTask = selectedProgram?.tasks.find(t => t.id === selectedTaskId);

  const programSummary = selectedProgram
    ? {
        totalPrograms: 1,
        totalTasks: selectedProgram.tasks.length,
        totalSubTasks: selectedProgram.tasks.reduce((acc, t) => acc + t.subTasks.length, 0),
        done: selectedProgram.tasks.reduce((acc, t) => acc + t.subTasks.filter(s => s.status === 'DONE').length, 0),
        wip: selectedProgram.tasks.reduce((acc, t) => acc + t.subTasks.filter(s => s.status === 'WIP').length, 0),
        delayed: selectedProgram.tasks.reduce((acc, t) => acc + t.subTasks.filter(s => s.status === 'DELAYED').length, 0),
      }
    : {
        totalPrograms: programs.length,
        totalTasks: programs.reduce((acc, p) => acc + p.tasks.length, 0),
        totalSubTasks: rows.length,
        done: rows.filter(r => r.status === 'DONE').length,
        wip: rows.filter(r => r.status === 'WIP').length,
        delayed: rows.filter(r => r.status === 'DELAYED').length,
      };

  // Search filter
  const filteredRows = rows.filter(r => {
    const matchesProgram = selectedProgramId === 'ALL' || r.programId === selectedProgramId;
    const matchesTask = selectedTaskId === 'ALL' || r.taskId === selectedTaskId;
    const matchesSearch = 
      r.programName.toLowerCase().includes(filterText.toLowerCase()) ||
      r.stage.toLowerCase().includes(filterText.toLowerCase()) ||
      r.taskName.toLowerCase().includes(filterText.toLowerCase()) ||
      r.subTaskName.toLowerCase().includes(filterText.toLowerCase()) ||
      r.pic.toLowerCase().includes(filterText.toLowerCase()) ||
      r.notes.toLowerCase().includes(filterText.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesProgram && matchesTask && matchesSearch && matchesStatus;
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

  const handleAddProgram = () => {
    if (!newProgramName.trim()) return;
    setPrograms(prev => [
      ...prev,
      {
        id: `PRG-${Date.now()}`,
        name: newProgramName.trim(),
        tasks: []
      }
    ]);
    setNewProgramName('');
    setNewItemMode(null);
  };

  const handleAddTask = () => {
    if (!selectedProgramId || selectedProgramId === 'ALL' || !newTaskName.trim()) return;
    setPrograms(prev => prev.map(program => {
      if (program.id !== selectedProgramId) return program;
      return {
        ...program,
        tasks: [
          ...program.tasks,
          {
            id: `TSK-${Date.now()}`,
            name: newTaskName.trim(),
            type: newTaskType,
            stage: newTaskStage,
            taskCode: newTaskCode.trim() || undefined,
            description: newTaskDescription.trim() || undefined,
            subTasks: []
          }
        ]
      };
    }));
    setNewTaskName('');
    setNewTaskStage('C. Pelaksanaan');
    setNewTaskCode('');
    setNewTaskDescription('');
    setNewItemMode(null);
  };

  const handleAddSubTask = () => {
    if (!selectedProgram || !selectedTask || !newSubTaskName.trim()) return;
    setPrograms(prev => prev.map(program => {
      if (program.id !== selectedProgram.id) return program;
      return {
        ...program,
        tasks: program.tasks.map(task => {
          if (task.id !== selectedTask.id) return task;
          return {
            ...task,
            subTasks: [
              ...task.subTasks,
              {
                id: `SUB-${Date.now()}`,
                name: newSubTaskName.trim(),
                status: newSubTaskStatus,
                progress: newSubTaskProgress,
                pic: newSubTaskPic.trim() || 'Belum Ditentukan',
                startDate: newSubTaskStartDate || new Date().toISOString().slice(0, 10),
                dueDate: newSubTaskDueDate || new Date().toISOString().slice(0, 10),
                notes: newSubTaskNotes.trim(),
                attachments: []
              }
            ]
          };
        })
      };
    }));
    setNewSubTaskName('');
    setNewSubTaskPic('');
    setNewSubTaskStatus('WIP');
    setNewSubTaskProgress(0);
    setNewSubTaskStartDate('');
    setNewSubTaskDueDate('');
    setNewSubTaskNotes('');
    setNewItemMode(null);
  };

  const handleAddAttachment = () => {
    if (!selectedFlatRow || !selectedProgramData || !selectedTaskData || !selectedSubTaskData) {
      setAttachmentError('Pilih satu baris data terlebih dahulu.');
      return;
    }

    const selectedName = attachmentForm.name.trim() || (attachmentFile ? attachmentFile.name : '');
    const selectedUrl = attachmentForm.url.trim();

    if (!selectedName) {
      setAttachmentError('Nama lampiran harus diisi.');
      return;
    }

    if (!selectedUrl && !attachmentFile) {
      setAttachmentError('Unggah file atau masukkan tautan dokumen.');
      return;
    }

    const urlValue = selectedUrl || (attachmentFile ? URL.createObjectURL(attachmentFile) : '');
    const typeValue = attachmentForm.type || (() => {
      if (!attachmentFile) return 'PDF' as Attachment['type'];
      const ext = attachmentFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'doc' || ext === 'docx') return 'DOCX' as Attachment['type'];
      if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') return 'IMAGE' as Attachment['type'];
      if (ext === 'zip' || ext === 'rar') return 'ZIP' as Attachment['type'];
      return 'OTHER' as Attachment['type'];
    })();

    setPrograms(prev => prev.map(program => {
      if (program.id !== selectedProgramData.id) return program;
      return {
        ...program,
        tasks: program.tasks.map(task => {
          if (task.id !== selectedTaskData.id) return task;
          return {
            ...task,
            subTasks: task.subTasks.map(subTask => {
              if (subTask.id !== selectedSubTaskData.id) return subTask;
              return {
                ...subTask,
                attachments: [
                  ...(subTask.attachments ?? []),
                  {
                    id: `ATT-${Date.now()}`,
                    name: selectedName,
                    type: typeValue,
                    url: urlValue,
                    uploadedAt: new Date().toISOString().slice(0, 10)
                  }
                ]
              };
            })
          };
        })
      };
    }));

    setAttachmentForm({ name: '', url: '', type: 'PDF' });
    setAttachmentFile(null);
    setAttachmentError('');
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (!selectedFlatRow || !selectedProgramData || !selectedTaskData || !selectedSubTaskData) return;

    setPrograms(prev => prev.map(program => {
      if (program.id !== selectedProgramData.id) return program;
      return {
        ...program,
        tasks: program.tasks.map(task => {
          if (task.id !== selectedTaskData.id) return task;
          return {
            ...task,
            subTasks: task.subTasks.map(subTask => {
              if (subTask.id !== selectedSubTaskData.id) return subTask;
              return {
                ...subTask,
                attachments: (subTask.attachments ?? []).filter(attachment => attachment.id !== attachmentId)
              };
            })
          };
        })
      };
    }));
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
          <div className="flex flex-1 flex-wrap gap-2">
            <input
              type="text"
              placeholder="Cari program, tahapan, task, sub-task, notes, PIC..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 min-w-[220px] text-slate-700 dark:text-slate-100"
            />
            <select
              value={selectedProgramId}
              onChange={e => {
                setSelectedProgramId(e.target.value);
                setSelectedTaskId('ALL');
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600 dark:text-slate-300"
            >
              {programOptions.map(option => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
            <select
              value={selectedTaskId}
              onChange={e => setSelectedTaskId(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600 dark:text-slate-300"
            >
              {taskOptions.map(option => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
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
          <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between w-full">
            <p className="text-xs text-slate-500 flex items-center font-mono">
              Peta Kolom Aktif: {customHeaders.filter(h => h.visible).length} Terpilih | Total {filteredRows.length} Rows
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsEditMode(prev => !prev)}
                className={`px-3 py-2 rounded-2xl text-xs font-semibold border transition ${isEditMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-800'}`}
              >
                {isEditMode ? 'Mode Edit Aktif' : 'Edit Data'}
              </button>
              <button
                onClick={() => setNewItemMode('program')}
                className="px-3 py-2 rounded-2xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Tambah Program
              </button>
              <button
                onClick={() => setNewItemMode('task')}
                className="px-3 py-2 rounded-2xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700"
              >
                Tambah Task List
              </button>
              <button
                onClick={() => setNewItemMode('subtask')}
                className="px-3 py-2 rounded-2xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Tambah Sub-Task Operasional
              </button>
            </div>
          </div>
        </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
            {newItemMode === 'program' && (
              <div className="grid gap-3 md:grid-cols-3 items-end">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nama Program Baru</label>
                  <input
                    value={newProgramName}
                    onChange={e => setNewProgramName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    placeholder="Masukkan nama program"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2 flex-wrap">
                  <button
                    onClick={handleAddProgram}
                    className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >Tambah Program</button>
                  <button
                    onClick={() => setNewItemMode(null)}
                    className="px-4 py-2 rounded-2xl bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >Batal</button>
                </div>
              </div>
            )}
            {newItemMode === 'task' && (
              <div className="grid gap-3 md:grid-cols-3 items-end">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Pilih Program</label>
                  <select
                    value={selectedProgramId}
                    onChange={e => setSelectedProgramId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  >
                    {programOptions.filter(option => option.id !== 'ALL').map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nama Task Baru</label>
                  <input
                    value={newTaskName}
                    onChange={e => setNewTaskName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    placeholder="Masukkan nama task"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tahapan Baku</label>
                  <select
                    value={newTaskStage}
                    onChange={e => setNewTaskStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value="A. Perencanaan">A. Perencanaan</option>
                    <option value="B. Persiapan">B. Persiapan</option>
                    <option value="C. Pelaksanaan">C. Pelaksanaan</option>
                    <option value="D. Penyerahan Hasil">D. Penyerahan Hasil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tipe Task</label>
                  <select
                    value={newTaskType}
                    onChange={e => setNewTaskType(e.target.value as 'RKM' | 'NON_RKM')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value="RKM">RKM</option>
                    <option value="NON_RKM">NON RKM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Kode Task</label>
                  <input
                    value={newTaskCode}
                    onChange={e => setNewTaskCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    placeholder="Contoh: C.3"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs text-slate-500 mb-1">Deskripsi Singkat</label>
                  <textarea
                    value={newTaskDescription}
                    onChange={e => setNewTaskDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    rows={2}
                    placeholder="Keterangan tugas / sub-tahapan"
                  />
                </div>
                <div className="md:col-span-4 flex gap-2 flex-wrap">
                  <button
                    onClick={handleAddTask}
                    className="px-4 py-2 rounded-2xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
                  >Tambah Task</button>
                  <button
                    onClick={() => setNewItemMode(null)}
                    className="px-4 py-2 rounded-2xl bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >Batal</button>
                </div>
              </div>
            )}
            {newItemMode === 'subtask' && (
              <div className="grid gap-3 md:grid-cols-4 items-end">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Program</label>
                  <select
                    value={selectedProgramId}
                    onChange={e => setSelectedProgramId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  >
                    {programOptions.filter(option => option.id !== 'ALL').map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Task</label>
                  <select
                    value={selectedTaskId}
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  >
                    {taskOptions.filter(option => option.id !== 'ALL').map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nama Sub-Task</label>
                  <input
                    value={newSubTaskName}
                    onChange={e => setNewSubTaskName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    placeholder="Masukkan nama sub-task"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">PIC</label>
                  <input
                    value={newSubTaskPic}
                    onChange={e => setNewSubTaskPic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    placeholder="Nama PIC"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select
                    value={newSubTaskStatus}
                    onChange={e => setNewSubTaskStatus(e.target.value as 'DONE' | 'WIP' | 'DELAYED')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value="WIP">WIP</option>
                    <option value="DONE">DONE</option>
                    <option value="DELAYED">DELAYED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Progress</label>
                  <input
                    type="number"
                    value={newSubTaskProgress}
                    onChange={e => setNewSubTaskProgress(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tgl Mulai</label>
                  <input
                    type="date"
                    value={newSubTaskStartDate}
                    onChange={e => setNewSubTaskStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tgl Target</label>
                  <input
                    type="date"
                    value={newSubTaskDueDate}
                    onChange={e => setNewSubTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs text-slate-500 mb-1">Keterangan</label>
                  <textarea
                    value={newSubTaskNotes}
                    onChange={e => setNewSubTaskNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    rows={2}
                    placeholder="Catatan atau hambatan"
                  />
                </div>
                <div className="md:col-span-4 flex gap-2 flex-wrap">
                  <button
                    onClick={handleAddSubTask}
                    className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                  >Tambah Sub-Task</button>
                  <button
                    onClick={() => setNewItemMode(null)}
                    className="px-4 py-2 rounded-2xl bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >Batal</button>
                </div>
              </div>
            )}
          </div>
          {selectedProgram && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Program Terpilih</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedProgram.name}</p>
                <p className="text-[11px] text-slate-500 mt-1">Total Task: {programSummary.totalTasks}</p>
                <p className="text-[11px] text-slate-500">Total Sub-Task: {programSummary.totalSubTasks}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status Ringkasan</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Done: {programSummary.done}</span>
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">WIP: {programSummary.wip}</span>
                  <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-800">Delayed: {programSummary.delayed}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Task Focus</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedTask ? selectedTask.name : 'Semua Task List'}</p>
                <p className="text-[11px] text-slate-500 mt-1">Tahapan: {selectedTask?.stage ?? 'C. Pelaksanaan'} • Sub-Task operasional: {selectedTask ? selectedTask.subTasks.length : selectedProgram.tasks.reduce((count, task) => count + task.subTasks.length, 0)}</p>
              </div>
            </div>
          )}

        {selectedFlatRow && selectedSubTaskData && (
          <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Manajemen Lampiran Dokumen</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedSubTaskData.name}</p>
                <p className="text-[11px] text-slate-500">Program: {selectedProgramData?.name} • Task: {selectedTaskData?.name}</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">{selectedAttachments.length} lampiran</span>
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">Drive / Dokumen Pendukung</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                {selectedAttachments.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada lampiran untuk sub-task ini.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAttachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{attachment.name}</p>
                          <p className="text-[11px] text-slate-500">{attachment.type} • {attachment.uploadedAt ?? 'Tanpa tanggal'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tambah Lampiran</p>
                <p className="mt-1 text-[11px] text-slate-500">Masukkan tautan Google Drive atau dokumen pendukung lainnya.</p>
                <div className="mt-3 space-y-3">
                  <input
                    value={attachmentForm.name}
                    onChange={e => setAttachmentForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Nama dokumen"
                  />
                  <label className="block text-xs text-slate-500">Unggah File</label>
                  <input
                    type="file"
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null;
                      setAttachmentFile(file);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                  {attachmentFile ? (
                    <div className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600 bg-slate-50">
                      File siap diunggah: <span className="font-medium text-slate-800">{attachmentFile.name}</span>
                    </div>
                  ) : null}
                  <input
                    value={attachmentForm.url}
                    onChange={e => setAttachmentForm(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Atau masukkan tautan dokumen (Google Drive, Sharepoint...)"
                  />
                  <select
                    value={attachmentForm.type}
                    onChange={e => setAttachmentForm(prev => ({ ...prev, type: e.target.value as Attachment['type'] }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX</option>
                    <option value="IMAGE">IMAGE</option>
                    <option value="ZIP">ZIP</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                  {attachmentError ? <p className="text-xs text-rose-600">{attachmentError}</p> : null}
                  <button
                    onClick={handleAddAttachment}
                    className="w-full rounded-2xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Unggah / Simpan Lampiran
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <th className="px-4 py-3 min-w-[120px] font-semibold border-slate-100 dark:border-slate-800 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={customHeaders.filter(h => h.visible).length + 1} className="px-6 py-12 text-center text-slate-400">
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
                    <td className="px-4 py-3 align-middle text-right border-slate-100 dark:border-slate-800 bg-clip-padding">
                      <button
                        onClick={() => {
                          if (selectedRowForEdit === row.rowId) {
                            setSelectedRowForEdit(null);
                            setEditingCell(null);
                          } else {
                            setSelectedRowForEdit(row.rowId);
                          }
                        }}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold transition ${selectedRowForEdit === row.rowId ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-800'}`}
                      >
                        <Edit2 className="w-4 h-4" />
                        {selectedRowForEdit === row.rowId ? 'Sedang Edit' : 'Edit'}
                      </button>
                    </td>
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
