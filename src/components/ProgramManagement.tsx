import React, { useEffect, useMemo, useState } from "react";
import { normalizeSubTaskState, toStatusCode } from "../utils";
import {
  Search,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreVertical,
  ArrowRight,
  BriefcaseBusiness,
  ListChecks,
  Files,
  Percent,
  X,
  FolderOpen,
  Users,
  CalendarDays,
  Upload,
  Eye,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Save,
} from "lucide-react";
import * as XLSX from "xlsx";

/* =========================================================
   TYPES
========================================================= */

type Tahapan =
  | "Perencanaan"
  | "Persiapan"
  | "Pelaksanaan"
  | "Penyerahan Hasil"
  | "Pensertipikatan";

type StatusTahapan = "Belum Mulai" | "Proses" | "Selesai" | "Tertunda";

/** Target navigasi dari notifikasi. */
export interface ManagementFocus {
  programId?: string;
  taskId?: string;
  subTaskId?: string;
}

type DetailTab = "detail" | "subtask" | "dokumen";

type ManagedDocument = {
  id: string;
  name: string;
  required: boolean;
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  file?: File;
};

interface ProgramManagementProps {
  programs?: any[];
  setPrograms?: (next: any[]) => void;
  onViewDetail?: (payload: any) => void;
  focus?: ManagementFocus | null;
  onFocusHandled?: () => void;
}

/* =========================================================
   CONSTANT
========================================================= */

const TAHAPAN_OPTIONS: Tahapan[] = [
  "Perencanaan",
  "Persiapan",
  "Pelaksanaan",
  "Penyerahan Hasil",
  "Pensertipikatan",
];

const ITEMS_PER_PAGE = 8;

const STATUS_OPTIONS: StatusTahapan[] = [
  "Belum Mulai",
  "Proses",
  "Selesai",
  "Tertunda",
];

/** Baris dianggap selesai (tidak dimonitor lagi) bila progres 100% atau berstatus Selesai. */
const isRowDone = (row: any) =>
  Number(row.progress) >= 100 || row.status === "Selesai";

const DEFAULT_DOCUMENTS = [
  "KTP pihak yang berhak",
  "Kartu Keluarga / dokumen ahli waris",
  "Sertipikat / alas hak tanah",
  "SPPT PBB dan bukti pembayaran",
  "Peta bidang / hasil pengukuran",
  "Surat keterangan / riwayat tanah",
  "Dokumen persetujuan / pelepasan hak",
  "Berita acara / hasil musyawarah",
  "Dokumen pembayaran / ganti kerugian",
  "Dokumen pendukung proses pengadaan tanah",
];

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const buildInitialDocuments = (row: any): ManagedDocument[] => {
  const source =
    row?.rawSubTask?.documents ||
    row?.rawSubTask?.dokumen ||
    row?.rawTask?.documents ||
    row?.rawTask?.dokumen ||
    [];

  if (Array.isArray(source) && source.length > 0) {
    return source.map((doc: any, index: number) => ({
      id: getText(doc.id, `doc-${index}-${makeId()}`),
      name: getText(
        doc.name,
        doc.documentName,
        doc.namaDokumen,
        `Dokumen ${index + 1}`
      ),
      required: doc.required !== false,
      fileName:
        getText(doc.fileName, doc.filename, doc.file?.name) || undefined,
      fileSize:
        getNumber(doc.fileSize, doc.size, doc.file?.size) || undefined,
      fileUrl:
        getText(doc.fileUrl, doc.url, doc.webViewLink) || undefined,
      file: doc.file instanceof File ? doc.file : undefined,
    }));
  }

  return DEFAULT_DOCUMENTS.map((name, index) => ({
    id: `required-${index + 1}`,
    name,
    required: true,
  }));
};

/* =========================================================
   HELPERS
========================================================= */

const getText = (...values: any[]) => {
  const found = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );

  return found !== undefined && found !== null
    ? String(found)
    : "";
};

const getNumber = (...values: any[]) => {
  const found = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !Number.isNaN(Number(value))
  );

  return found !== undefined ? Number(found) : 0;
};

const normalizeTahapan = (value?: string): Tahapan => {
  const text = String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();

  if (text.includes("perencanaan")) return "Perencanaan";
  if (text.includes("persiapan")) return "Persiapan";

  if (
    text.includes("penyerahan") ||
    text.includes("serah hasil") ||
    text.includes("penyerahan hasil")
  ) {
    return "Penyerahan Hasil";
  }

  if (
    text.includes("sertipikat") ||
    text.includes("sertifikat") ||
    text.includes("pensertipikatan")
  ) {
    return "Pensertipikatan";
  }

  if (text.includes("pelaksanaan")) return "Pelaksanaan";

  /*
    Sementara fallback menjadi Pelaksanaan agar data lama
    yang belum mempunyai field tahapan tetap bisa tampil.

    Nanti setelah data.ts sudah kita rapikan per sub-task,
    fallback ini praktis tidak akan digunakan lagi.
  */
  return "Pelaksanaan";
};

const normalizeStatus = (value?: string): StatusTahapan => {
  const text = String(value || "").toUpperCase().trim();

  if (text === "DONE" || text === "SELESAI") return "Selesai";
  if (text === "DELAYED" || text === "TERTUNDA") return "Tertunda";
  if (text === "NOT_STARTED" || text === "BELUM MULAI")
    return "Belum Mulai";

  return "Proses";
};

const formatDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

/* =========================================================
   FLATTEN PROGRAM → TASK → SUB TASK
========================================================= */

const flattenPrograms = (programs: any[]) => {
  const rows: any[] = [];

  programs.forEach((program, programIndex) => {
    const programName = getText(
      program.name,
      program.programName,
      program.title,
      program.namaProgram,
      `Program ${programIndex + 1}`
    );

    const tasks =
      program.tasks ||
      program.taskList ||
      program.taskLists ||
      program.children ||
      [];

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return;
    }

    tasks.forEach((task: any, taskIndex: number) => {
      const taskName = getText(
        task.name,
        task.taskName,
        task.title,
        task.taskList,
        `Task ${taskIndex + 1}`
      );

      const subTasks =
        task.subTasks ||
        task.subtasks ||
        task.subTaskList ||
        task.children ||
        [];

      /*
        Jika task belum punya sub-task, task sendiri tetap
        ditampilkan sebagai satu baris.
      */
      if (!Array.isArray(subTasks) || subTasks.length === 0) {
        rows.push({
          id: getText(task.id, `${programIndex}-${taskIndex}`),
          programId: getText(program.id, String(programIndex)),
          taskId: getText(task.id, String(taskIndex)),
          subTaskId: "",
          programName,
          taskName,
          subTaskName: "-",

          tahapan: normalizeTahapan(
            getText(task.tahapan, task.stage, program.tahapan)
          ),

          pic: getText(
            task.pic,
            task.PIC,
            task.personInCharge,
            "-"
          ),

          progress: getNumber(
            task.progress,
            task.progressPercent,
            0
          ),

          status: normalizeStatus(
            getText(task.status, task.state)
          ),

          target: getText(
            task.dueDate,
            task.targetDate,
            task.endDate,
            task.tglTarget
          ),

          documentUploaded: getNumber(
            task.documentUploaded,
            task.uploadedDocuments,
            0
          ),

          documentTotal: getNumber(
            task.documentTotal,
            task.totalDocuments,
            0
          ),

          rawProgram: program,
          rawTask: task,
          rawSubTask: null,
        });

        return;
      }

      subTasks.forEach((subTask: any, subIndex: number) => {
        /*
          Kalau datamu mempunyai sub-sub-task, kita ambil
          setiap sub-sub-task sebagai baris paling detail.
        */

        const children =
          subTask.subTasks ||
          subTask.subSubTasks ||
          subTask.children ||
          [];

        const createRow = (
          item: any,
          customId: string,
          fallbackName: string
        ) => ({
          id: getText(item.id, customId),
          programId: getText(program.id, String(programIndex)),
          taskId: getText(task.id, String(taskIndex)),
          subTaskId: getText(item.id, customId),
          startDate: getText(item.startDate, subTask.startDate),
          notes: getText(item.notes, subTask.notes),

          programName,

          taskName,

          subTaskName: getText(
            item.name,
            item.title,
            item.subTask,
            item.subSubTask,
            fallbackName
          ),

          tahapan: normalizeTahapan(
            getText(
              item.tahapan,
              item.stage,
              subTask.tahapan,
              task.tahapan,
              task.stage,
              program.tahapan
            )
          ),

          pic: getText(
            item.pic,
            item.PIC,
            item.personInCharge,
            subTask.pic,
            subTask.PIC,
            "-"
          ),

          progress: getNumber(
            item.progress,
            item.progressPercent,
            subTask.progress,
            0
          ),

          status: normalizeStatus(
            getText(
              item.status,
              item.state,
              subTask.status
            )
          ),

          target: getText(
            item.dueDate,
            item.targetDate,
            item.endDate,
            item.tglTarget,
            subTask.dueDate,
            subTask.targetDate,
            subTask.endDate
          ),

          documentUploaded: getNumber(
            item.documentUploaded,
            item.uploadedDocuments,
            subTask.documentUploaded,
            0
          ),

          documentTotal: getNumber(
            item.documentTotal,
            item.totalDocuments,
            subTask.documentTotal,
            0
          ),

          rawProgram: program,
          rawTask: task,
          rawSubTask: item,
        });

        if (Array.isArray(children) && children.length > 0) {
          children.forEach((child: any, childIndex: number) => {
            rows.push(
              createRow(
                child,
                `${programIndex}-${taskIndex}-${subIndex}-${childIndex}`,
                getText(
                  child.name,
                  child.title,
                  subTask.name,
                  subTask.title,
                  `Sub-task ${subIndex + 1}`
                )
              )
            );
          });
        } else {
          rows.push(
            createRow(
              subTask,
              `${programIndex}-${taskIndex}-${subIndex}`,
              `Sub-task ${subIndex + 1}`
            )
          );
        }
      });
    });
  });

  return rows;
};

/* =========================================================
   COMPONENT
========================================================= */

export function ProgramManagement({
  programs = [],
  setPrograms,
  onViewDetail,
  focus,
  onFocusHandled,
}: ProgramManagementProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedProgram, setSelectedProgram] =
    useState("ALL");

  const [selectedTahapan, setSelectedTahapan] =
    useState("ALL");

  const [selectedStatus, setSelectedStatus] =
    useState("ALL");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  const [detailTab, setDetailTab] = useState<
  "detail" | "subtask" | "dokumen"
>("detail");

  const [rowOverrides, setRowOverrides] = useState<Record<string, any>>({});
  const [documentStore, setDocumentStore] = useState<
    Record<string, ManagedDocument[]>
  >({});
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocName, setEditingDocName] = useState("");
  const [additionalDocName, setAdditionalDocName] = useState("");
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);

  /* =======================================================
     DATA
  ======================================================= */

  const baseRows = useMemo(
    () => flattenPrograms(programs),
    [programs]
  );

  const rows = useMemo(
    () =>
      baseRows.map((row) => ({
        ...row,
        ...(rowOverrides[row.id] || {}),
      })),
    [baseRows, rowOverrides]
  );

  const programOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.programName))
    ).sort();
  }, [rows]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      // Hanya pekerjaan yang masih berjalan yang dimonitor.
      // Item selesai tetap bisa dilihat lewat tombol "Tampilkan yang selesai"
      // atau dengan memilih filter status "Selesai".
      const visibleByProgress =
        showCompleted || selectedStatus === "Selesai" || !isRowDone(row);

      const matchProgram =
        selectedProgram === "ALL" ||
        row.programName === selectedProgram;

      const matchTahapan =
        selectedTahapan === "ALL" ||
        row.tahapan === selectedTahapan;

      const matchStatus =
        selectedStatus === "ALL" ||
        row.status === selectedStatus;

      const matchSearch =
        !keyword ||
        row.programName.toLowerCase().includes(keyword) ||
        row.taskName.toLowerCase().includes(keyword) ||
        row.subTaskName.toLowerCase().includes(keyword) ||
        row.pic.toLowerCase().includes(keyword);

      return (
        visibleByProgress &&
        matchProgram &&
        matchTahapan &&
        matchStatus &&
        matchSearch
      );
    });
  }, [
    rows,
    selectedProgram,
    selectedTahapan,
    selectedStatus,
    search,
    showCompleted,
  ]);

  const completedCount = useMemo(
    () => rows.filter(isRowDone).length,
    [rows]
  );

  const completedPrograms = useMemo(() => {
    const byProgram = new Map<string, { total: number; done: number }>();
    rows.forEach((row) => {
      const entry = byProgram.get(row.programName) || { total: 0, done: 0 };
      entry.total += 1;
      if (isRowDone(row)) entry.done += 1;
      byProgram.set(row.programName, entry);
    });
    return Array.from(byProgram.entries())
      .filter(([, value]) => value.total > 0 && value.done === value.total)
      .map(([name]) => name);
  }, [rows]);

  /* =======================================================
     NAVIGASI DARI NOTIFIKASI
  ======================================================= */

  useEffect(() => {
    if (!focus) return;

    const target =
      (focus.subTaskId &&
        rows.find((row) => row.subTaskId === focus.subTaskId)) ||
      (focus.taskId &&
        rows.find((row) => row.taskId === focus.taskId && !isRowDone(row))) ||
      (focus.taskId && rows.find((row) => row.taskId === focus.taskId)) ||
      null;

    if (target) {
      if (isRowDone(target)) setShowCompleted(true);
      setSelectedProgram(target.programName);
      setSelectedTahapan("ALL");
      setSelectedStatus("ALL");
      setSearch("");
      handleOpenDetail(target);
      if (!focus.subTaskId) setDetailTab("subtask");
    } else if (focus.programId) {
      const programRow = rows.find((row) => row.programId === focus.programId);
      if (programRow) setSelectedProgram(programRow.programName);
    }

    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / ITEMS_PER_PAGE)
  );

  const safePage = Math.min(page, totalPages);

  const visibleRows = filteredRows.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const resetFilters = () => {
    setSelectedProgram("ALL");
    setSelectedTahapan("ALL");
    setSelectedStatus("ALL");
    setSearch("");
    setPage(1);
  };

  /* =======================================================
     DETAIL, EDIT & DOCUMENT
  ======================================================= */

  const handleOpenDetail = (row: any) => {
    setSelectedDetail(row);
    setDetailTab("detail");
    setEditMode(false);

    setEditForm({
      programName: row.programName,
      taskName: row.taskName,
      subTaskName: row.subTaskName,
      tahapan: row.tahapan,
      pic: row.pic,
      progress: row.progress,
      status: row.status,
      target: row.target,
    });

    setDocumentStore((prev) => {
      if (prev[row.id]) return prev;

      return {
        ...prev,
        [row.id]: buildInitialDocuments(row),
      };
    });

    onViewDetail?.(row);
  };

  const handleCloseDetail = () => {
    setSelectedDetail(null);
    setDetailTab("detail");
    setEditMode(false);
    setEditingDocId(null);
    setAdditionalDocName("");
    setAdditionalFile(null);
  };

  const saveDetailEdit = () => {
    if (!selectedDetail) return;

    // Selaraskan status & progres (Selesai <-> 100%).
    const normalized = normalizeSubTaskState({
      status: toStatusCode(editForm.status),
      progress: Number(editForm.progress || 0),
    });

    const nextOverride = {
      programName: editForm.programName,
      taskName: editForm.taskName,
      subTaskName: editForm.subTaskName,
      tahapan: editForm.tahapan,
      pic: editForm.pic,
      progress: normalized.progress,
      status: normalizeStatus(normalized.status),
      target: editForm.target,
    };

    if (setPrograms) {
      // Tulis langsung ke data pusat -> Master Data, Dashboard, Laporan,
      // dan database ikut terbarui.
      const stageLabel: Record<string, string> = {
        Perencanaan: "A. Perencanaan",
        Persiapan: "B. Persiapan",
        Pelaksanaan: "C. Pelaksanaan",
        "Penyerahan Hasil": "D. Penyerahan Hasil",
        Pensertipikatan: "E. Pensertipikatan",
      };

      const nextPrograms = programs.map((program: any) => {
        if (String(program.id) !== String(selectedDetail.programId)) return program;

        return {
          ...program,
          name: nextOverride.programName?.trim() || program.name,
          tasks: (program.tasks || []).map((task: any) => {
            if (String(task.id) !== String(selectedDetail.taskId)) return task;

            const stageChanged =
              normalizeTahapan(task.stage) !== nextOverride.tahapan;

            return {
              ...task,
              name: nextOverride.taskName?.trim() || task.name,
              stage: stageChanged
                ? stageLabel[nextOverride.tahapan] || nextOverride.tahapan
                : task.stage,
              subTasks: (task.subTasks || []).map((subTask: any) =>
                String(subTask.id) !== String(selectedDetail.subTaskId)
                  ? subTask
                  : {
                      ...subTask,
                      name: nextOverride.subTaskName?.trim() || subTask.name,
                      pic: nextOverride.pic,
                      progress: normalized.progress,
                      status: normalized.status,
                      dueDate: nextOverride.target || subTask.dueDate,
                      estimatedSchedule:
                        nextOverride.target && nextOverride.target !== subTask.dueDate
                          ? false
                          : subTask.estimatedSchedule,
                    }
              ),
            };
          }),
        };
      });

      setPrograms(nextPrograms);
      setSelectedDetail((prev: any) =>
        prev ? { ...prev, ...nextOverride } : prev
      );
      setEditForm((prev: any) => ({ ...prev, ...nextOverride }));
      setEditMode(false);
      return;
    }

    setRowOverrides((prev) => ({
      ...prev,
      [selectedDetail.id]: {
        ...(prev[selectedDetail.id] || {}),
        ...nextOverride,
      },
    }));

    setSelectedDetail((prev: any) =>
      prev ? { ...prev, ...nextOverride } : prev
    );

    setEditMode(false);
  };

  const taskRows = selectedDetail
    ? rows.filter(
        (row) =>
          row.programId === selectedDetail.programId &&
          row.taskId === selectedDetail.taskId
      )
    : [];

  const selectedDocuments: ManagedDocument[] = selectedDetail
    ? documentStore[selectedDetail.id] || []
    : [];

  const getDocumentCount = (row: any) => {
    const docs = documentStore[row.id];

    if (!docs) {
      return {
        uploaded: row.documentUploaded || 0,
        total: row.documentTotal || 0,
      };
    }

    return {
      uploaded: docs.filter((doc) => !!doc.fileName || !!doc.fileUrl).length,
      total: docs.length,
    };
  };

  const uploadDocumentFile = (
    rowId: string,
    docId: string,
    file: File
  ) => {
    const fileUrl = URL.createObjectURL(file);

    setDocumentStore((prev) => ({
      ...prev,
      [rowId]: (prev[rowId] || []).map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              file,
              fileName: file.name,
              fileSize: file.size,
              fileUrl,
            }
          : doc
      ),
    }));
  };

  const removeDocumentFile = (rowId: string, docId: string) => {
    setDocumentStore((prev) => ({
      ...prev,
      [rowId]: (prev[rowId] || []).map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              file: undefined,
              fileName: undefined,
              fileSize: undefined,
              fileUrl: undefined,
            }
          : doc
      ),
    }));
  };

  const deleteDocument = (rowId: string, docId: string) => {
    setDocumentStore((prev) => {
      const target = (prev[rowId] || []).find((doc) => doc.id === docId);

      if (target?.required) {
        return {
          ...prev,
          [rowId]: (prev[rowId] || []).map((doc) =>
            doc.id === docId
              ? {
                  ...doc,
                  file: undefined,
                  fileName: undefined,
                  fileSize: undefined,
                  fileUrl: undefined,
                }
              : doc
          ),
        };
      }

      return {
        ...prev,
        [rowId]: (prev[rowId] || []).filter((doc) => doc.id !== docId),
      };
    });
  };

  const saveDocumentName = (rowId: string, docId: string) => {
    const value = editingDocName.trim();
    if (!value) return;

    setDocumentStore((prev) => ({
      ...prev,
      [rowId]: (prev[rowId] || []).map((doc) =>
        doc.id === docId ? { ...doc, name: value } : doc
      ),
    }));

    setEditingDocId(null);
    setEditingDocName("");
  };

  const addAdditionalDocument = () => {
    if (!selectedDetail) return;

    const name = additionalDocName.trim();
    if (!name) return;

    const fileUrl = additionalFile
      ? URL.createObjectURL(additionalFile)
      : undefined;

    const newDoc: ManagedDocument = {
      id: makeId(),
      name,
      required: false,
      file: additionalFile || undefined,
      fileName: additionalFile?.name,
      fileSize: additionalFile?.size,
      fileUrl,
    };

    setDocumentStore((prev) => ({
      ...prev,
      [selectedDetail.id]: [
        ...(prev[selectedDetail.id] || []),
        newDoc,
      ],
    }));

    setAdditionalDocName("");
    setAdditionalFile(null);
  };

  /* =======================================================
     EXPORT EXCEL
  ======================================================= */

  const exportExcel = () => {
    const exportData = filteredRows.map(
      (row, index) => ({
        No: index + 1,
        Program: row.programName,
        Task: row.taskName,
        "Sub-task": row.subTaskName,
        Tahapan: row.tahapan,
        PIC: row.pic,
        "Progress (%)": row.progress,
        Status: row.status,
        Target: formatDate(row.target),
        Dokumen: `${getDocumentCount(row).uploaded}/${getDocumentCount(row).total}`,
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(exportData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Monitoring"
    );

    XLSX.writeFile(
      workbook,
      "Monitoring_Pengadaan_Tanah.xlsx"
    );
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="text-[#102448]">
      <main className="space-y-5">
        {/* FILTER */}

        <section className="rounded-[18px] border border-[#e1e8f2] bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr_0.9fr_1.25fr]">
            <FilterSelect
              label="Program"
              value={selectedProgram}
              onChange={(value) => {
                setSelectedProgram(value);
                setPage(1);
              }}
              options={[
                {
                  value: "ALL",
                  label: "Semua Program",
                },
                ...programOptions.map((program) => ({
                  value: program,
                  label: program,
                })),
              ]}
            />

            <FilterSelect
              label="Tahapan"
              value={selectedTahapan}
              onChange={(value) => {
                setSelectedTahapan(value);
                setPage(1);
              }}
              options={[
                {
                  value: "ALL",
                  label: "Semua Tahapan",
                },
                ...TAHAPAN_OPTIONS.map((item) => ({
                  value: item,
                  label: item,
                })),
              ]}
            />

            <FilterSelect
              label="Status"
              value={selectedStatus}
              onChange={(value) => {
                setSelectedStatus(value);
                setPage(1);
              }}
              options={[
                {
                  value: "ALL",
                  label: "Semua Status",
                },
                {
                  value: "Belum Mulai",
                  label: "Belum Mulai",
                },
                {
                  value: "Proses",
                  label: "Proses",
                },
                {
                  value: "Selesai",
                  label: "Selesai",
                },
                {
                  value: "Tertunda",
                  label: "Tertunda",
                },
              ]}
            />

            <div>
              <label className="mb-2 block text-[12px] font-semibold text-[#273b5d]">
                Cari Task / Sub-task
              </label>

              <div className="flex h-[44px] items-center rounded-xl border border-[#dce4ef] bg-white px-3.5 transition focus-within:border-[#1666c5] focus-within:ring-2 focus-within:ring-[#1666c5]/10">
                <Search
                  size={17}
                  className="mr-2.5 text-[#7890ad]"
                />

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari nama task atau sub-task..."
                  className="w-full bg-transparent text-[12px] text-[#233b62] outline-none placeholder:text-[#9aa9bc]"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={resetFilters}
              className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-[#d9e2ee] bg-white px-4 text-[12px] font-semibold text-[#203859] transition hover:bg-[#f8fafc]"
            >
              <RotateCcw size={15} />
              Reset Filter
            </button>
          </div>
        </section>

        {/* TABLE */}

        <section className="overflow-hidden rounded-[18px] border border-[#e0e7f0] bg-white shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
          <header className="flex flex-col gap-4 border-b border-[#e7edf5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[#13294b]">
                Daftar Program, Task & Sub-task
              </h2>

              <p className="mt-1 text-[11px] text-[#788aa4]">
                {showCompleted
                  ? "Menampilkan seluruh pekerjaan, termasuk yang sudah selesai."
                  : `Hanya pekerjaan yang masih berjalan. ${completedCount} sub task selesai (100%) disembunyikan.`}
              </p>
              {!showCompleted && completedPrograms.length > 0 && (
                <p className="mt-1 text-[10.5px] font-semibold text-emerald-700">
                  Program selesai 100%: {completedPrograms.join(", ")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCompleted((value) => !value);
                setPage(1);
              }}
              className={`inline-flex h-[38px] items-center justify-center gap-2 rounded-xl border px-4 text-[12px] font-semibold transition ${
                showCompleted
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#d8e1ed] bg-white text-[#203859] hover:bg-[#f8fafc]"
              }`}
            >
              <CheckCircle2 size={15} />
              {showCompleted
                ? "Sembunyikan yang selesai"
                : `Tampilkan yang selesai (${completedCount})`}
            </button>

            <button
              onClick={exportExcel}
              className="inline-flex h-[38px] items-center justify-center gap-2 rounded-xl border border-[#d8e1ed] bg-white px-4 text-[12px] font-semibold text-[#203859] transition hover:bg-[#f8fafc]"
            >
              <Download size={15} />
              Export Excel
            </button>
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse">
              <thead>
                <tr className="border-b border-[#e9eef5] bg-[#fbfcfe]">
                  <TableHeader>NO</TableHeader>
                  <TableHeader>PROGRAM</TableHeader>
                  <TableHeader>TASK</TableHeader>
                  <TableHeader>SUB-TASK</TableHeader>
                  <TableHeader>TAHAPAN</TableHeader>
                  <TableHeader>PIC</TableHeader>
                  <TableHeader>PROGRESS</TableHeader>
                  <TableHeader>STATUS TAHAPAN</TableHeader>
                  <TableHeader>TARGET</TableHeader>
                  <TableHeader>DOKUMEN</TableHeader>
                  <TableHeader>AKSI</TableHeader>
                </tr>
              </thead>

              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto max-w-sm">
                        <FileText
                          size={28}
                          className="mx-auto text-[#9aacbf]"
                        />

                        <p className="mt-3 text-sm font-semibold text-[#334968]">
                          Data tidak ditemukan
                        </p>

                        <p className="mt-1 text-xs text-[#8a9ab0]">
                          Coba ubah filter atau kata pencarian.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-b border-[#edf1f6] transition last:border-b-0 hover:bg-[#fafcff]"
                    >
                      <TableCell>
                        {(safePage - 1) *
                          ITEMS_PER_PAGE +
                          index +
                          1}
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[145px] font-semibold leading-[1.45] text-[#142b4d]">
                          {row.programName}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[165px] leading-[1.45]">
                          {row.taskName}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[190px] leading-[1.45]">
                          {row.subTaskName}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-[#253d62]">
                          {row.tahapan}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[125px] leading-[1.45]">
                          {row.pic}
                        </div>
                      </TableCell>

                      <TableCell>
                        <ProgressBar
                          progress={row.progress}
                        />
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>

                      <TableCell>
                        {formatDate(row.target)}
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-1.5">
                          <FileText
                            size={14}
                            className="text-[#7890ab]"
                          />

                          <span>
                            {getDocumentCount(row).uploaded}/
                            {getDocumentCount(row).total}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDetail(row)}
                            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[#d8e3f0] bg-white px-3 text-[11px] font-semibold text-[#0865c8] transition hover:bg-[#f4f8fd]"
                          >
                            Lihat Detail
                            <ArrowRight size={13} />
                          </button>

                          <button
                            onClick={() => handleOpenDetail(row)}
                            className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[#dce4ee] bg-white text-[#506884] hover:bg-[#f8fafc]"
                            title="Buka detail"
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </TableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}

          <footer className="flex flex-col gap-4 border-t border-[#e7edf4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-[#7589a4]">
              Menampilkan{" "}
              {filteredRows.length === 0
                ? 0
                : (safePage - 1) * ITEMS_PER_PAGE + 1}
              {" - "}
              {Math.min(
                safePage * ITEMS_PER_PAGE,
                filteredRows.length
              )}{" "}
              dari {filteredRows.length} data
            </p>

            <div className="flex items-center gap-2">
              <PaginationButton
                disabled={safePage === 1}
                onClick={() =>
                  changePage(safePage - 1)
                }
              >
                <ChevronLeft size={15} />
              </PaginationButton>

              {Array.from({
                length: totalPages,
              }).map((_, index) => {
                const pageNumber = index + 1;

                return (
                  <button
                    key={pageNumber}
                    onClick={() =>
                      changePage(pageNumber)
                    }
                    className={`flex h-[32px] min-w-[32px] items-center justify-center rounded-lg border px-2 text-[11px] font-semibold transition ${
                      safePage === pageNumber
                        ? "border-[#1267c7] bg-[#1267c7] text-white"
                        : "border-[#dce4ef] bg-white text-[#29415f] hover:bg-[#f7f9fc]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <PaginationButton
                disabled={safePage === totalPages}
                onClick={() =>
                  changePage(safePage + 1)
                }
              >
                <ChevronRight size={15} />
              </PaginationButton>
            </div>
          </footer>
        </section>
      </main>

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {selectedDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07172b]/45 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[22px] border border-[#dce5ef] bg-white shadow-[0_30px_100px_rgba(0,25,60,0.25)]">
            <div className="flex items-start justify-between border-b border-[#e7edf4] px-6 py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf5fd] text-[#0b62b8]">
                  <FolderOpen size={21} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-[20px] font-bold tracking-[-0.025em] text-[#142b4d]">
                    Detail Task Pengadaan Tanah
                  </h3>
                  <p className="mt-1 max-w-[900px] truncate text-[12px] font-medium text-[#445c79]">
                    {selectedDetail.taskName}
                  </p>
                  <p className="mt-1 text-[11px] text-[#8494a9]">
                    {selectedDetail.programName}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseDetail}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#71839a] transition hover:bg-[#f2f5f8] hover:text-[#203859]"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-7 border-b border-[#e7edf4] bg-[#fafcff] px-6">
              <ModalTab
                active={detailTab === "detail"}
                onClick={() => setDetailTab("detail")}
              >
                Detail Task
              </ModalTab>

              <ModalTab
                active={detailTab === "subtask"}
                onClick={() => setDetailTab("subtask")}
              >
                Daftar Sub-task
              </ModalTab>

              <ModalTab
                active={detailTab === "dokumen"}
                onClick={() => setDetailTab("dokumen")}
              >
                Dokumen
              </ModalTab>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {detailTab === "detail" && (
                <div>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[16px] font-bold text-[#173052]">
                        Informasi Task
                      </h4>
                      <p className="mt-1 text-[11px] text-[#8191a6]">
                        Informasi program, tahapan, PIC, progres, dan target.
                      </p>
                    </div>

                    {!editMode ? (
                      <button
                        onClick={() => setEditMode(true)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d9e3ee] bg-white px-4 text-[11px] font-semibold text-[#20527f] transition hover:bg-[#f7f9fc]"
                      >
                        <Pencil size={14} />
                        Edit Data
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditMode(false)}
                          className="inline-flex h-9 items-center rounded-lg border border-[#d9e3ee] bg-white px-4 text-[11px] font-semibold text-[#526a85]"
                        >
                          Batal
                        </button>

                        <button
                          onClick={saveDetailEdit}
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0d5fac] px-4 text-[11px] font-semibold text-white"
                        >
                          <Save size={14} />
                          Simpan
                        </button>
                      </div>
                    )}
                  </div>

                  {!editMode ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <DetailInfoCard
                        icon={<BriefcaseBusiness size={17} />}
                        label="Program"
                        value={selectedDetail.programName}
                      />
                      <DetailInfoCard
                        icon={<ListChecks size={17} />}
                        label="Task"
                        value={selectedDetail.taskName}
                      />
                      <DetailInfoCard
                        icon={<Files size={17} />}
                        label="Sub-task"
                        value={selectedDetail.subTaskName}
                      />
                      <DetailInfoCard
                        icon={<FolderOpen size={17} />}
                        label="Tahapan"
                        value={selectedDetail.tahapan}
                      />
                      <DetailInfoCard
                        icon={<Users size={17} />}
                        label="PIC"
                        value={selectedDetail.pic}
                      />
                      <DetailInfoCard
                        icon={<CheckCircle2 size={17} />}
                        label="Status Tahapan"
                        value={selectedDetail.status}
                      />
                      <DetailInfoCard
                        icon={<Percent size={17} />}
                        label="Progress"
                        value={`${selectedDetail.progress}%`}
                      />
                      <DetailInfoCard
                        icon={<CalendarDays size={17} />}
                        label="Target"
                        value={formatDate(selectedDetail.target)}
                      />
                      <DetailInfoCard
                        icon={<FileText size={17} />}
                        label="Dokumen"
                        value={`${getDocumentCount(selectedDetail).uploaded}/${getDocumentCount(selectedDetail).total}`}
                      />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Program">
                        <input
                          value={editForm.programName || ""}
                          onChange={(e) =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              programName: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-[#dce4ef] px-3.5 text-[12px] outline-none focus:border-[#1666c5]"
                        />
                      </FormField>

                      <FormField label="Task">
                        <input
                          value={editForm.taskName || ""}
                          onChange={(e) =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              taskName: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-[#dce4ef] px-3.5 text-[12px] outline-none focus:border-[#1666c5]"
                        />
                      </FormField>

                      <FormField label="Sub-task">
                        <input
                          value={editForm.subTaskName || ""}
                          onChange={(e) =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              subTaskName: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-[#dce4ef] px-3.5 text-[12px] outline-none focus:border-[#1666c5]"
                        />
                      </FormField>

                      <FormField label="Tahapan">
                        <select
                          value={editForm.tahapan || "Pelaksanaan"}
                          onChange={(e) =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              tahapan: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-[#dce4ef] bg-white px-3.5 text-[12px] outline-none focus:border-[#1666c5]"
                        >
                          {TAHAPAN_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="PIC">
                        <input
                          value={editForm.pic || ""}
                          onChange={(e) =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              pic: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-[#dce4ef] px-3.5 text-[12px] outline-none focus:border-[#1666c5]"
                        />
                      </FormField>

                      <FormField label="Status Tahapan">
                        <select
                          value={editForm.status || "Proses"}
                          onChange={(e) =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              status: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-[#dce4ef] bg-white px-3.5 text-[12px] outline-none focus:border-[#1666c5]"
                        >
                          {STATUS_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="Progress (%)">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editForm.progress ?? 0}
                          onChange={(e) =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              progress: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-[#dce4ef] px-3.5 text-[12px] outline-none focus:border-[#1666c5]"
                        />
                      </FormField>

                      <FormField label="Target">
                        <input
                          type="date"
                          value={
                            editForm.target &&
                            /^\d{4}-\d{2}-\d{2}/.test(editForm.target)
                              ? editForm.target.slice(0, 10)
                              : ""
                          }
                          onChange={(e) =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              target: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-[#dce4ef] px-3.5 text-[12px] outline-none focus:border-[#1666c5]"
                        />
                      </FormField>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "subtask" && (
                <div>
                  <div className="mb-5">
                    <h4 className="text-[16px] font-bold text-[#173052]">
                      Daftar Sub-task
                    </h4>
                    <p className="mt-1 text-[11px] text-[#8191a6]">
                      Seluruh sub-task dalam task yang sama.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#e0e7f0]">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[850px] border-collapse">
                        <thead>
                          <tr className="border-b border-[#e6ecf3] bg-[#fafcff]">
                            <TableHeader>NO</TableHeader>
                            <TableHeader>SUB-TASK</TableHeader>
                            <TableHeader>TAHAPAN</TableHeader>
                            <TableHeader>PIC</TableHeader>
                            <TableHeader>PROGRESS</TableHeader>
                            <TableHeader>STATUS</TableHeader>
                            <TableHeader>TARGET</TableHeader>
                          </tr>
                        </thead>

                        <tbody>
                          {taskRows.map((item, index) => (
                            <tr
                              key={item.id}
                              className="border-b border-[#edf1f6] last:border-b-0"
                            >
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <div className="max-w-[260px] font-medium text-[#203859]">
                                  {item.subTaskName}
                                </div>
                              </TableCell>
                              <TableCell>{item.tahapan}</TableCell>
                              <TableCell>{item.pic}</TableCell>
                              <TableCell>
                                <ProgressBar progress={item.progress} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={item.status} />
                              </TableCell>
                              <TableCell>{formatDate(item.target)}</TableCell>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "dokumen" && (
                <div>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-[16px] font-bold text-[#173052]">
                        Dokumen Task
                      </h4>
                      <p className="mt-1 text-[11px] text-[#8191a6]">
                        Upload, lihat, edit nama, ganti file, atau hapus dokumen.
                      </p>
                    </div>

                    <div className="rounded-full border border-[#dce5ef] bg-[#fafcff] px-3 py-1.5 text-[10px] font-semibold text-[#46617e]">
                      {
                        selectedDocuments.filter(
                          (doc) => !!doc.fileName || !!doc.fileUrl
                        ).length
                      }
                      /{selectedDocuments.length} Lengkap
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#e0e7f0]">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[920px] border-collapse">
                        <thead>
                          <tr className="border-b border-[#e6ecf3] bg-[#fafcff]">
                            <TableHeader>NAMA DOKUMEN</TableHeader>
                            <TableHeader>FILE</TableHeader>
                            <TableHeader>STATUS</TableHeader>
                            <TableHeader>AKSI</TableHeader>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedDocuments.map((doc) => {
                            const uploaded =
                              !!doc.fileName || !!doc.fileUrl;

                            return (
                              <tr
                                key={doc.id}
                                className="border-b border-[#edf1f6] last:border-b-0"
                              >
                                <TableCell>
                                  {editingDocId === doc.id ? (
                                    <div className="flex max-w-[340px] items-center gap-2">
                                      <input
                                        value={editingDocName}
                                        onChange={(e) =>
                                          setEditingDocName(e.target.value)
                                        }
                                        className="h-9 min-w-0 flex-1 rounded-lg border border-[#d8e2ee] px-3 text-[11px] outline-none focus:border-[#1666c5]"
                                      />

                                      <button
                                        onClick={() =>
                                          saveDocumentName(
                                            selectedDetail.id,
                                            doc.id
                                          )
                                        }
                                        className="h-9 rounded-lg bg-[#0d5fac] px-3 text-[10px] font-semibold text-white"
                                      >
                                        Simpan
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="max-w-[340px]">
                                      <div className="font-semibold text-[#273d5b]">
                                        {doc.name}
                                      </div>

                                      <div className="mt-1 text-[9px] text-[#8a9ab0]">
                                        {doc.required
                                          ? "Dokumen task"
                                          : "Dokumen tambahan"}
                                      </div>
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell>
                                  {uploaded ? (
                                    <div>
                                      <div className="max-w-[260px] truncate font-medium text-[#344e6d]">
                                        {doc.fileName || "File tersimpan"}
                                      </div>
                                      <div className="mt-1 text-[9px] text-[#8a9ab0]">
                                        {formatFileSize(doc.fileSize)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="italic text-[#94a2b4]">
                                      Belum ada file
                                    </span>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <span className="inline-flex min-w-[92px] items-center justify-center rounded-full border border-[#dce4ee] bg-[#fbfcfe] px-3 py-1 text-[9px] font-medium text-[#405976]">
                                    {uploaded
                                      ? "Sudah Diunggah"
                                      : "Belum Diunggah"}
                                  </span>
                                </TableCell>

                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {uploaded && doc.fileUrl && (
                                      <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dce5ef] bg-white text-[#2366a4]"
                                        title="Lihat file"
                                      >
                                        <Eye size={14} />
                                      </a>
                                    )}

                                    <button
                                      onClick={() => {
                                        setEditingDocId(doc.id);
                                        setEditingDocName(doc.name);
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dce5ef] bg-white text-[#315978]"
                                      title="Edit nama dokumen"
                                    >
                                      <Pencil size={14} />
                                    </button>

                                    <label
                                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#dce5ef] bg-white text-[#315978]"
                                      title={uploaded ? "Ganti file" : "Upload file"}
                                    >
                                      <Upload size={14} />
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={(event) => {
                                          const file =
                                            event.target.files?.[0];

                                          if (file) {
                                            uploadDocumentFile(
                                              selectedDetail.id,
                                              doc.id,
                                              file
                                            );
                                          }

                                          event.currentTarget.value = "";
                                        }}
                                      />
                                    </label>

                                    {(uploaded || !doc.required) && (
                                      <button
                                        onClick={() =>
                                          uploaded
                                            ? removeDocumentFile(
                                                selectedDetail.id,
                                                doc.id
                                              )
                                            : deleteDocument(
                                                selectedDetail.id,
                                                doc.id
                                              )
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dce5ef] bg-white text-[#596d83]"
                                        title={
                                          uploaded
                                            ? "Hapus file"
                                            : "Hapus dokumen"
                                        }
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </TableCell>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-dashed border-[#ccd9e7] bg-[#fafcff] p-5">
                    <div className="mb-4">
                      <h5 className="text-[13px] font-bold text-[#203b5d]">
                        Upload Dokumen Tambahan
                      </h5>
                      <p className="mt-1 text-[10px] leading-5 text-[#8191a6]">
                        Tambahkan dokumen lain yang diperlukan dalam proses
                        pengadaan tanah.
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                      <FormField label="Nama Dokumen">
                        <input
                          value={additionalDocName}
                          onChange={(e) =>
                            setAdditionalDocName(e.target.value)
                          }
                          placeholder="Contoh: Surat Persetujuan Tambahan"
                          className="h-11 w-full rounded-xl border border-[#dce4ef] bg-white px-3.5 text-[11px] outline-none focus:border-[#1666c5]"
                        />
                      </FormField>

                      <FormField label="File">
                        <label className="flex h-11 cursor-pointer items-center justify-between rounded-xl border border-[#dce4ef] bg-white px-3.5 text-[11px] text-[#516984]">
                          <span className="max-w-[320px] truncate">
                            {additionalFile
                              ? additionalFile.name
                              : "Pilih file dokumen"}
                          </span>

                          <Upload size={15} />

                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) =>
                              setAdditionalFile(
                                e.target.files?.[0] || null
                              )
                            }
                          />
                        </label>
                      </FormField>

                      <button
                        onClick={addAdditionalDocument}
                        disabled={!additionalDocName.trim()}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0d5fac] px-5 text-[11px] font-semibold text-white transition hover:bg-[#0a4f91] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={15} />
                        Tambah Dokumen
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-[#e7edf4] bg-[#fafcff] px-6 py-4">
              <button
                onClick={handleCloseDetail}
                className="h-10 rounded-xl bg-[#1267c7] px-5 text-[11px] font-semibold text-white transition hover:bg-[#0d57aa]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-semibold text-[#273b5d]">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-[44px] w-full appearance-none rounded-xl border border-[#dce4ef] bg-white px-3.5 pr-10 text-[12px] font-medium text-[#233b62] outline-none transition focus:border-[#1666c5] focus:ring-2 focus:ring-[#1666c5]/10"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8fa9]"
        />
      </div>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.02em] text-[#5c7090]">
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
    <td className="px-4 py-3.5 align-middle text-[10.5px] text-[#334b6c]">
      {children}
    </td>
  );
}

function ProgressBar({
  progress,
}: {
  progress: number;
}) {
  const safeProgress = Math.min(
    100,
    Math.max(0, Number(progress || 0))
  );

  return (
    <div className="w-[105px]">
      <div className="mb-1.5 text-[10px] font-semibold text-[#243b5e]">
        {safeProgress}%
      </div>

      <div className="h-[5px] overflow-hidden rounded-full bg-[#e7edf4]">
        <div
          className="h-full rounded-full bg-[#0c4b91]"
          style={{
            width: `${safeProgress}%`,
          }}
        />
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: StatusTahapan;
}) {
  /*
    Sengaja dibuat NETRAL/FORMAL.
    Tidak memakai merah, hijau, kuning berdasarkan tahapan.
  */

  return (
    <span className="inline-flex min-w-[62px] items-center justify-center rounded-full border border-[#d6e0eb] bg-[#fbfcfe] px-3 py-1 text-[9.5px] font-medium text-[#304967]">
      {status}
    </span>
  );
}

function PaginationButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex h-[32px] w-[32px] items-center justify-center rounded-lg border border-[#dce4ef] bg-white text-[#3f5877] transition hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}


function ModalTab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative py-4 text-[11px] font-semibold transition ${
        active
          ? "text-[#0c64be]"
          : "text-[#71839a] hover:text-[#314b69]"
      }`}
    >
      {children}

      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-[#1267c7]" />
      )}
    </button>
  );
}

function DetailInfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#e2e9f1] bg-[#fbfcfe] p-4">
      <div className="flex items-center gap-2 text-[#54708e]">
        {icon}

        <span className="text-[10px] font-semibold uppercase tracking-[0.04em]">
          {label}
        </span>
      </div>

      <div className="mt-3 break-words text-[12px] font-semibold leading-5 text-[#253e5f]">
        {value || "-"}
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

export default ProgramManagement;