import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChecklistEntry,
  ChecklistState,
  DEFAULT_STAGE_DOCUMENTS,
  STAGES,
  StageName,
} from '../checklist';
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Upload,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface ChecklistStagesProps {
  programs?: any[];
  /** Status dokumen per program (tersimpan di database). */
  checklist?: ChecklistState;
  onChecklistChange?: (programId: string, documentKey: string, entry: ChecklistEntry) => void;
  /** Program yang langsung dipilih (mis. dari klik notifikasi). */
  focusProgramId?: string | null;
  onFocusHandled?: () => void;
  backendOnline?: boolean;
}

interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
  status: 'AVAILABLE' | 'MISSING' | 'OPTIONAL';
  uploadDate?: string;
  pic?: string;
  fileName?: string;
  fileUrl?: string;
}

const getText = (...values: any[]) => {
  const found = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== '',
  );

  return found === undefined || found === null ? '' : String(found);
};

const normalizeStage = (...values: any[]): StageName => {
  const text = getText(...values)
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();

  if (text.includes('perencanaan')) return 'Perencanaan';
  if (text.includes('persiapan')) return 'Persiapan';

  if (
    text.includes('penyerahan') ||
    text.includes('serah hasil')
  ) {
    return 'Penyerahan Hasil';
  }

  if (
    text.includes('sertipikat') ||
    text.includes('sertifikat') ||
    text.includes('pensertipikatan')
  ) {
    return 'Pensertipikatan';
  }

  return 'Pelaksanaan';
};

const formatDate = (value?: string) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const flattenProgramDocuments = (
  program: any,
  selectedStage: StageName,
): ChecklistItem[] => {
  const items: ChecklistItem[] = [];
  const seen = new Set<string>();

  const appendDocs = ({
    documents,
    task,
    subTask,
    stageSource,
    prefix,
  }: {
    documents: any;
    task?: any;
    subTask?: any;
    stageSource?: any;
    prefix: string;
  }) => {
    if (!Array.isArray(documents)) return;

    documents.forEach((doc: any, index: number) => {
      const stage = normalizeStage(
        doc?.tahapan,
        doc?.stage,
        stageSource,
        subTask?.tahapan,
        subTask?.stage,
        task?.tahapan,
        task?.stage,
        program?.tahapan,
        program?.stage,
      );

      if (stage !== selectedStage) return;

      const name = getText(
        doc?.name,
        doc?.documentName,
        doc?.namaDokumen,
        doc?.title,
        doc?.fileName,
        `Dokumen ${index + 1}`,
      );

      const key = `${stage}|${name}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const fileName = getText(
        doc?.fileName,
        doc?.filename,
        doc?.file?.name,
      );

      const fileUrl = getText(
        doc?.fileUrl,
        doc?.url,
        doc?.webViewLink,
        doc?.downloadUrl,
        doc?.file?.url,
      );

      const required = doc?.required !== false;

      items.push({
        id: getText(doc?.id, `${prefix}-${index}`),
        name,
        required,
        status:
          fileName || fileUrl
            ? 'AVAILABLE'
            : required
              ? 'MISSING'
              : 'OPTIONAL',
        uploadDate: getText(
          doc?.uploadDate,
          doc?.tanggalUpload,
          doc?.uploadedAt,
          doc?.updatedAt,
          doc?.createdAt,
        ),
        pic: getText(
          doc?.uploader,
          doc?.uploadedBy,
          doc?.pic,
          doc?.PIC,
          subTask?.pic,
          subTask?.PIC,
          task?.pic,
          task?.PIC,
          '-',
        ),
        fileName: fileName || undefined,
        fileUrl: fileUrl || undefined,
      });
    });
  };

  appendDocs({
    documents: program?.documents || program?.dokumen,
    stageSource: program?.tahapan || program?.stage,
    prefix: `program-${program?.id || 'x'}`,
  });

  const tasks =
    program?.tasks ||
    program?.taskList ||
    program?.taskLists ||
    program?.children ||
    [];

  if (Array.isArray(tasks)) {
    tasks.forEach((task: any, taskIndex: number) => {
      appendDocs({
        documents: task?.documents || task?.dokumen,
        task,
        stageSource: task?.tahapan || task?.stage,
        prefix: `task-${taskIndex}`,
      });

      const subTasks =
        task?.subTasks ||
        task?.subtasks ||
        task?.subTaskList ||
        task?.children ||
        [];

      if (!Array.isArray(subTasks)) return;

      subTasks.forEach((subTask: any, subIndex: number) => {
        appendDocs({
          documents: subTask?.documents || subTask?.dokumen,
          task,
          subTask,
          stageSource: subTask?.tahapan || subTask?.stage,
          prefix: `sub-${taskIndex}-${subIndex}`,
        });
      });
    });
  }

  return items;
};

const buildChecklistForStage = (
  program: any,
  stage: StageName,
): ChecklistItem[] => {
  const fromData = flattenProgramDocuments(program, stage);

  const byName = new Map(
    fromData.map((item) => [item.name.toLowerCase(), item]),
  );

  const requiredItems = DEFAULT_STAGE_DOCUMENTS[stage].map(
    (name, index): ChecklistItem => {
      const matched = Array.from(byName.values()).find((item) => {
        const a = item.name.toLowerCase();
        const b = name.toLowerCase();
        return a.includes(b) || b.includes(a);
      });

      if (matched) return matched;

      return {
        id: `default-${stage}-${index}`,
        name,
        required: true,
        status: 'MISSING',
        pic: '-',
      };
    },
  );

  const extras = fromData.filter(
    (item) =>
      !requiredItems.some(
        (required) =>
          required.name.toLowerCase() === item.name.toLowerCase(),
      ),
  );

  return [...requiredItems, ...extras];
};

export function ChecklistStages({
  programs = [],
  checklist = {},
  onChecklistChange,
  focusProgramId,
  onFocusHandled,
  backendOnline = false,
}: ChecklistStagesProps) {
  const [selectedProgramId, setSelectedProgramId] = useState(
    programs?.[0]?.id ?? 'ALL',
  );
  const [selectedStage, setSelectedStage] =
    useState<StageName>('Persiapan');

  // Perubahan sementara bila tidak ada handler pusat (fallback).
  const [sessionOverrides, setSessionOverrides] = useState<
    Record<string, Record<string, Partial<ChecklistItem>>>
  >({});

  const [previewItem, setPreviewItem] =
    useState<ChecklistItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!focusProgramId) return;
    setSelectedProgramId(focusProgramId);
    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusProgramId]);

  const selectedProgram = useMemo(() => {
    if (!programs.length) return null;

    return (
      programs.find(
        (program) => String(program.id) === String(selectedProgramId),
      ) ?? programs[0]
    );
  }, [programs, selectedProgramId]);

  const localOverrides: Record<string, Partial<ChecklistItem>> = useMemo(() => {
    const programId = String(selectedProgram?.id ?? '');
    return {
      ...((checklist[programId] || {}) as Record<string, Partial<ChecklistItem>>),
      ...(sessionOverrides[programId] || {}),
    };
  }, [checklist, sessionOverrides, selectedProgram]);

  const stageSummaries = useMemo(() => {
    if (!selectedProgram) {
      return STAGES.map((stage) => ({
        stage,
        available: 0,
        total: DEFAULT_STAGE_DOCUMENTS[stage].length,
        percentage: 0,
      }));
    }

    return STAGES.map((stage) => {
      const items = buildChecklistForStage(selectedProgram, stage).map(
        (item) => ({
          ...item,
          ...(localOverrides[item.id] || {}),
        }),
      );

      const required = items.filter((item) => item.required);
      const available = required.filter(
        (item) => item.status === 'AVAILABLE',
      ).length;

      const total = required.length;

      return {
        stage,
        available,
        total,
        percentage:
          total > 0 ? Math.round((available / total) * 100) : 0,
      };
    });
  }, [selectedProgram, localOverrides]);

  const checklistItems = useMemo(() => {
    if (!selectedProgram) return [];

    return buildChecklistForStage(selectedProgram, selectedStage).map(
      (item) => ({
        ...item,
        ...(localOverrides[item.id] || {}),
      }),
    );
  }, [selectedProgram, selectedStage, localOverrides]);

  const requiredItems = checklistItems.filter((item) => item.required);

  const availableCount = requiredItems.filter(
    (item) => item.status === 'AVAILABLE',
  ).length;

  const missingCount = requiredItems.filter(
    (item) => item.status === 'MISSING',
  ).length;

  const optionalCount = checklistItems.filter(
    (item) => item.status === 'OPTIONAL',
  ).length;

  const completeness =
    requiredItems.length > 0
      ? Math.round((availableCount / requiredItems.length) * 100)
      : 0;

  const donutData = [
    {
      name: 'Tersedia',
      value: availableCount,
      color: '#22C55E',
    },
    {
      name: 'Belum Ada',
      value: missingCount,
      color: '#F97360',
    },
    {
      name: 'Tidak Wajib',
      value: optionalCount,
      color: '#CBD5E1',
    },
  ];

  const setEntry = (itemId: string, entry: ChecklistEntry) => {
    const programId = String(selectedProgram?.id ?? '');
    if (onChecklistChange) {
      onChecklistChange(programId, itemId, entry);
    } else {
      setSessionOverrides((previous) => ({
        ...previous,
        [programId]: { ...(previous[programId] || {}), [itemId]: entry },
      }));
    }
  };

  const markAvailable = (item: ChecklistItem) =>
    setEntry(item.id, {
      status: 'AVAILABLE',
      uploadDate: new Date().toISOString(),
      pic: getText(selectedProgram?.pic, '-'),
      notes: 'Ditandai tersedia (dokumen fisik)',
    });

  const markMissing = (item: ChecklistItem) =>
    setEntry(item.id, {
      status: item.required ? 'MISSING' : 'OPTIONAL',
      uploadDate: '',
      pic: '-',
      fileName: '',
      fileUrl: '',
      notes: '',
    });

  const openUpload = (itemId: string) => {
    setUploadTargetId(itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file || !uploadTargetId) {
      event.target.value = '';
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    const today = new Date().toISOString();

    const entry: ChecklistEntry = {
      status: 'AVAILABLE',
      fileName: file.name,
      fileUrl,
      uploadDate: today,
      pic: getText(selectedProgram?.pic, '-'),
    };
    const programId = String(selectedProgram?.id ?? '');

    if (onChecklistChange) {
      onChecklistChange(programId, uploadTargetId, entry);
    } else {
      setSessionOverrides((previous) => ({
        ...previous,
        [programId]: { ...(previous[programId] || {}), [uploadTargetId]: entry },
      }));
    }

    setUploadTargetId(null);
    event.target.value = '';
  };

  const openFile = (item: ChecklistItem) => {
    if (item.fileUrl) {
      window.open(item.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setPreviewItem(item);
  };

  return (
    <>
      <div className="text-[#102448]">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[230px_minmax(0,1fr)_250px]">
          {/* LEFT PANEL */}
          <aside className="rounded-[18px] border border-[#e0e7f0] bg-white p-4 shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
            <label className="mb-2 block text-[10px] font-semibold text-[#405a79]">
              Pilih Program
            </label>

            <select
              value={selectedProgram?.id ?? ''}
              onChange={(event) =>
                setSelectedProgramId(event.target.value)
              }
              className="h-[40px] w-full rounded-xl border border-[#dce4ef] bg-white px-3 text-[10px] font-semibold text-[#233b62] outline-none focus:border-[#1666c5] focus:ring-2 focus:ring-[#1666c5]/10"
            >
              {programs.map((program, index) => (
                <option
                  key={program.id ?? index}
                  value={program.id ?? index}
                >
                  {getText(
                    program.name,
                    program.programName,
                    program.title,
                    `Program ${index + 1}`,
                  )}
                </option>
              ))}
            </select>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold text-[#405a79]">
                Tahapan
              </p>

              <div className="space-y-1.5">
                {stageSummaries.map((summary, index) => {
                  const active = selectedStage === summary.stage;

                  return (
                    <button
                      key={summary.stage}
                      type="button"
                      onClick={() => setSelectedStage(summary.stage)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition ${
                        active
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[8px] font-bold ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-[9px] font-semibold ${
                              active
                                ? 'text-blue-700'
                                : 'text-[#274163]'
                            }`}
                          >
                            {summary.stage}
                          </span>

                          <span className="shrink-0 text-[8px] font-bold text-[#203859]">
                            {summary.percentage}%
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between">
                          <div className="h-1 w-[70px] overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: `${summary.percentage}%`,
                              }}
                            />
                          </div>

                          <span className="text-[7px] text-slate-400">
                            ({summary.available}/{summary.total})
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* CENTER TABLE */}
          <section className="overflow-hidden rounded-[18px] border border-[#e0e7f0] bg-white shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
            <header className="border-b border-[#e7edf5] px-5 py-4">
              <h2 className="text-[14px] font-bold text-[#13294b]">
                Checklist Tahapan {selectedStage}
              </h2>
              <p className="mt-1 text-[9px] text-[#788aa4]">
                Dokumen wajib dan pendukung pada tahapan yang dipilih.
              </p>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-[#e9eef5] bg-[#fbfcfe]">
                    <TableHeader>NO</TableHeader>
                    <TableHeader>DOKUMEN WAJIB</TableHeader>
                    <TableHeader>STATUS</TableHeader>
                    <TableHeader>TANGGAL UPLOAD</TableHeader>
                    <TableHeader>PIC</TableHeader>
                    <TableHeader>AKSI</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {checklistItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#edf1f6] last:border-b-0 hover:bg-[#fafcff]"
                    >
                      <TableCell>{index + 1}</TableCell>

                      <TableCell>
                        <div className="max-w-[260px] font-semibold leading-[1.45] text-[#142b4d]">
                          {item.name}
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>

                      <TableCell>
                        {formatDate(item.uploadDate)}
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[120px]">
                          {item.pic || '-'}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {item.status === 'AVAILABLE' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openFile(item)}
                                className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50"
                                title="Lihat dokumen"
                              >
                                <Eye size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openFile(item)}
                                className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50"
                                title="Download dokumen"
                              >
                                <Download size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => markMissing(item)}
                                className="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2 text-[8px] font-semibold text-slate-500 hover:bg-slate-50"
                                title="Tandai dokumen belum ada"
                              >
                                Batalkan
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openUpload(item.id)}
                                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[8px] font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <Upload size={12} />
                                Upload
                              </button>
                              <button
                                type="button"
                                onClick={() => markAvailable(item)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[8px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                title="Tandai dokumen sudah ada tanpa upload file"
                              >
                                <CheckCircle2 size={12} />
                                Tandai Ada
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* RIGHT SUMMARY */}
          <aside className="rounded-[18px] border border-[#e0e7f0] bg-white p-4 shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
            <h2 className="text-[13px] font-bold text-[#13294b]">
              Ringkasan Tahapan
            </h2>

            <div className="relative mt-4 h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donutData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => [
                      value ?? 0,
                      'Dokumen',
                   ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-[22px] font-extrabold text-[#0B2A63]">
                  {availableCount}/{requiredItems.length}
                </strong>
                <span className="mt-1 text-[8px] text-slate-400">
                  Dokumen Lengkap
                </span>
              </div>
            </div>

            <div className="mt-2 space-y-2.5">
              {donutData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2 text-[8.5px] font-semibold text-slate-500">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </span>

                  <strong className="text-[9px] text-[#203859]">
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 text-center">
              <strong className="text-[22px] font-extrabold text-blue-700">
                {completeness}%
              </strong>
              <span className="ml-1 text-[9px] font-semibold text-slate-500">
                Kelengkapan
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                <p className="text-[8px] leading-4 text-slate-500">
                  {backendOnline
                    ? 'Status checklist tersimpan di database (MySQL). Tahapan Perencanaan s.d. Penyerahan Hasil telah ditandai lengkap sesuai kondisi eksisting.'
                    : 'Mode lokal: database belum terhubung, perubahan checklist hanya tersimpan selama sesi ini.'}
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-[#102448]">
                Detail Dokumen Checklist
              </h3>
            </div>

            <div className="space-y-4 p-5">
              <DetailField label="Dokumen" value={previewItem.name} />
              <DetailField
                label="Status"
                value={
                  previewItem.status === 'AVAILABLE'
                    ? 'Tersedia'
                    : previewItem.status === 'MISSING'
                      ? 'Belum Ada'
                      : 'Tidak Wajib'
                }
              />
              <DetailField
                label="Tanggal Upload"
                value={formatDate(previewItem.uploadDate)}
              />
              <DetailField label="PIC" value={previewItem.pic || '-'} />
              <DetailField
                label="Nama File"
                value={previewItem.fileName || '-'}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="h-9 rounded-lg border border-slate-200 px-4 text-[10px] font-semibold text-slate-600"
              >
                Tutup
              </button>

              {previewItem.fileUrl && (
                <button
                  type="button"
                  onClick={() => openFile(previewItem)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-[10px] font-semibold text-white"
                >
                  <FileText size={13} />
                  Buka Dokumen
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-[7.5px] font-bold uppercase tracking-[0.05em] text-[#71839c]">
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
    <td className="px-4 py-3 text-[9.5px] text-[#5d708b]">
      {children}
    </td>
  );
}

function StatusBadge({
  status,
}: {
  status: ChecklistItem['status'];
}) {
  if (status === 'AVAILABLE') {
    return (
      <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-600">
        Tersedia
      </span>
    );
  }

  if (status === 'OPTIONAL') {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-500">
        Tidak Wajib
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-[8px] font-bold text-red-500">
      Belum Ada
    </span>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold text-slate-700">
        {value || '-'}
      </p>
    </div>
  );
}