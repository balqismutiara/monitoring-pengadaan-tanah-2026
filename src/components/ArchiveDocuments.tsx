import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  MoreVertical,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';

interface ArchiveDocumentsProps {
  programs?: any[];
}

interface ArchiveDocumentRow {
  archiveId: string;
  sourceId?: string;
  name: string;
  type: string;
  programName: string;
  stage: string;
  documentNumber: string;
  documentDate: string;
  uploader: string;
  uploadDate: string;
  fileName?: string;
  fileUrl?: string;
}

const ITEMS_PER_PAGE = 8;

const getText = (...values: any[]) => {
  const value = values.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      String(item).trim() !== '',
  );

  return value === undefined || value === null ? '' : String(value);
};

const normalizeStage = (...values: any[]) => {
  const raw = getText(...values).toLowerCase().replace(/_/g, ' ').trim();

  if (raw.includes('perencanaan')) return 'Perencanaan';
  if (raw.includes('persiapan')) return 'Persiapan';
  if (raw.includes('penyerahan')) return 'Penyerahan Hasil';

  if (
    raw.includes('sertipikat') ||
    raw.includes('sertifikat') ||
    raw.includes('pensertipikatan')
  ) {
    return 'Pensertipikatan';
  }

  if (raw.includes('pelaksanaan')) return 'Pelaksanaan';

  return raw ? getText(...values) : 'Belum Diklasifikasikan';
};

const inferDocumentType = (document: any) => {
  const explicitType = getText(
    document?.type,
    document?.documentType,
    document?.jenisDokumen,
    document?.category,
    document?.kategori,
  );

  if (explicitType) return explicitType;

  const name = getText(
    document?.name,
    document?.documentName,
    document?.namaDokumen,
    document?.fileName,
  ).toLowerCase();

  if (
    name.includes('berita acara') ||
    name.includes('ba ') ||
    name.startsWith('ba')
  ) {
    return 'Berita Acara';
  }

  if (
    name.includes('sertipikat') ||
    name.includes('sertifikat') ||
    name.includes('alas hak')
  ) {
    return 'Sertipikat / Alas Hak';
  }

  if (name.includes('penilaian') || name.includes('appraisal')) {
    return 'Penilaian';
  }

  if (name.includes('peta') || name.includes('lokasi')) {
    return 'Peta / Lokasi';
  }

  if (name.includes('ganti rugi') || name.includes('ganti kerugian')) {
    return 'Ganti Kerugian';
  }

  if (name.includes('musyawarah')) {
    return 'Musyawarah';
  }

  if (name.includes('pelepasan hak')) {
    return 'Pelepasan Hak';
  }

  return 'Dokumen Pendukung';
};

const toDate = (value?: string) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string, includeTime = false) => {
  const date = toDate(value);

  if (!date) return value || '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(date);
};

const extractYear = (value?: string) => {
  const date = toDate(value);
  return date ? String(date.getFullYear()) : '';
};

const flattenArchiveDocuments = (
  programs: any[],
): ArchiveDocumentRow[] => {
  const rows: ArchiveDocumentRow[] = [];
  const fingerprints = new Set<string>();

  const appendDocuments = ({
    documents,
    program,
    task,
    subTask,
    programIndex,
    taskIndex,
    subTaskIndex,
    sourceLabel,
  }: {
    documents: any;
    program: any;
    task?: any;
    subTask?: any;
    programIndex: number;
    taskIndex?: number;
    subTaskIndex?: number;
    sourceLabel: string;
  }) => {
    if (!Array.isArray(documents) || documents.length === 0) return;

    documents.forEach((document: any, documentIndex: number) => {
      if (!document) return;

      const programName = getText(
        program?.name,
        program?.programName,
        program?.namaProgram,
        program?.title,
        `Program ${programIndex + 1}`,
      );

      const name = getText(
        document?.name,
        document?.documentName,
        document?.namaDokumen,
        document?.title,
        document?.fileName,
        `Dokumen ${documentIndex + 1}`,
      );

      const sourceId = getText(
        document?.id,
        document?.documentId,
        document?.idDokumen,
      );

      const documentNumber = getText(
        document?.documentNumber,
        document?.noDocument,
        document?.noDokumen,
        document?.nomorDokumen,
        document?.number,
        '-',
      );

      const documentDate = getText(
        document?.documentDate,
        document?.tanggalDokumen,
        document?.date,
        document?.createdAt,
      );

      const uploadDate = getText(
        document?.uploadDate,
        document?.tanggalUpload,
        document?.uploadedAt,
        document?.updatedAt,
        document?.createdAt,
      );

      const uploader = getText(
        document?.uploader,
        document?.uploadedBy,
        document?.uploadBy,
        document?.pic,
        document?.PIC,
        subTask?.pic,
        subTask?.PIC,
        task?.pic,
        task?.PIC,
        '-',
      );

      const fileName = getText(
        document?.fileName,
        document?.filename,
        document?.file?.name,
      );

      const fileUrl = getText(
        document?.fileUrl,
        document?.url,
        document?.webViewLink,
        document?.downloadUrl,
        document?.file?.url,
      );

      const stage = normalizeStage(
        document?.tahapan,
        document?.stage,
        subTask?.tahapan,
        subTask?.stage,
        task?.tahapan,
        task?.stage,
        program?.tahapan,
        program?.stage,
      );

      const fingerprint = [
        sourceId,
        programName,
        name,
        documentNumber,
        fileUrl,
        sourceLabel,
      ].join('|');

      if (fingerprints.has(fingerprint)) return;
      fingerprints.add(fingerprint);

      const archiveId =
        sourceId ||
        `ARS-${String(programIndex + 1).padStart(2, '0')}${String(
          (taskIndex ?? 0) + 1,
        ).padStart(2, '0')}${String((subTaskIndex ?? 0) + 1).padStart(
          2,
          '0',
        )}${String(documentIndex + 1).padStart(2, '0')}`;

      rows.push({
        archiveId,
        sourceId: sourceId || undefined,
        name,
        type: inferDocumentType(document),
        programName,
        stage,
        documentNumber,
        documentDate,
        uploader,
        uploadDate,
        fileName: fileName || undefined,
        fileUrl: fileUrl || undefined,
      });
    });
  };

  programs.forEach((program, programIndex) => {
    appendDocuments({
      documents: program?.documents || program?.dokumen,
      program,
      programIndex,
      sourceLabel: `program-${programIndex}`,
    });

    const tasks =
      program?.tasks ||
      program?.taskList ||
      program?.taskLists ||
      program?.children ||
      [];

    if (!Array.isArray(tasks)) return;

    tasks.forEach((task: any, taskIndex: number) => {
      appendDocuments({
        documents: task?.documents || task?.dokumen,
        program,
        task,
        programIndex,
        taskIndex,
        sourceLabel: `task-${programIndex}-${taskIndex}`,
      });

      const subTasks =
        task?.subTasks ||
        task?.subtasks ||
        task?.subTaskList ||
        task?.children ||
        [];

      if (!Array.isArray(subTasks)) return;

      subTasks.forEach((subTask: any, subTaskIndex: number) => {
        appendDocuments({
          documents: subTask?.documents || subTask?.dokumen,
          program,
          task,
          subTask,
          programIndex,
          taskIndex,
          subTaskIndex,
          sourceLabel: `sub-${programIndex}-${taskIndex}-${subTaskIndex}`,
        });

        const children =
          subTask?.subTasks ||
          subTask?.subSubTasks ||
          subTask?.children ||
          [];

        if (!Array.isArray(children)) return;

        children.forEach((child: any, childIndex: number) => {
          appendDocuments({
            documents: child?.documents || child?.dokumen,
            program,
            task,
            subTask: child,
            programIndex,
            taskIndex,
            subTaskIndex: childIndex,
            sourceLabel: `child-${programIndex}-${taskIndex}-${subTaskIndex}-${childIndex}`,
          });
        });
      });
    });
  });

  return rows.sort((a, b) => {
    const dateA = toDate(a.uploadDate)?.getTime() ?? 0;
    const dateB = toDate(b.uploadDate)?.getTime() ?? 0;
    return dateB - dateA;
  });
};

export function ArchiveDocuments({
  programs = [],
}: ArchiveDocumentsProps) {
  const [search, setSearch] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [page, setPage] = useState(1);
  const [previewDocument, setPreviewDocument] =
    useState<ArchiveDocumentRow | null>(null);

  const allDocuments = useMemo(
    () => flattenArchiveDocuments(programs),
    [programs],
  );

  const programOptions = useMemo(
    () =>
      Array.from(
        new Set(allDocuments.map((document) => document.programName)),
      ).sort(),
    [allDocuments],
  );

  const stageOptions = useMemo(
    () =>
      Array.from(
        new Set(allDocuments.map((document) => document.stage)),
      ).sort(),
    [allDocuments],
  );

  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set(allDocuments.map((document) => document.type)),
      ).sort(),
    [allDocuments],
  );

  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allDocuments
            .map(
              (document) =>
                extractYear(document.documentDate) ||
                extractYear(document.uploadDate),
            )
            .filter(Boolean),
        ),
      ).sort((a, b) => Number(b) - Number(a)),
    [allDocuments],
  );

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return allDocuments.filter((document) => {
      const matchesSearch =
        !keyword ||
        [
          document.archiveId,
          document.name,
          document.type,
          document.programName,
          document.stage,
          document.documentNumber,
          document.uploader,
          document.fileName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      const matchesProgram =
        selectedProgram === 'ALL' ||
        document.programName === selectedProgram;

      const matchesStage =
        selectedStage === 'ALL' || document.stage === selectedStage;

      const matchesType =
        selectedType === 'ALL' || document.type === selectedType;

      const documentYear =
        extractYear(document.documentDate) ||
        extractYear(document.uploadDate);

      const matchesYear =
        selectedYear === 'ALL' || documentYear === selectedYear;

      return (
        matchesSearch &&
        matchesProgram &&
        matchesStage &&
        matchesType &&
        matchesYear
      );
    });
  }, [
    allDocuments,
    search,
    selectedProgram,
    selectedStage,
    selectedType,
    selectedYear,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE),
  );

  const safePage = Math.min(page, totalPages);

  const visibleDocuments = filteredDocuments.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const resetFilters = () => {
    setSearch('');
    setSelectedProgram('ALL');
    setSelectedStage('ALL');
    setSelectedType('ALL');
    setSelectedYear('ALL');
    setPage(1);
  };

  const openFile = (document: ArchiveDocumentRow) => {
    if (!document.fileUrl) {
      setPreviewDocument(document);
      return;
    }

    window.open(document.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadFile = (document: ArchiveDocumentRow) => {
    if (!document.fileUrl) {
      setPreviewDocument(document);
      return;
    }

    const anchor = window.document.createElement('a');
    anchor.href = document.fileUrl;
    anchor.download = document.fileName || document.name;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  };

  return (
    <>
      <div className="space-y-5 text-[#102448]">
        {/* FILTER */}
        <section className="rounded-[18px] border border-[#e1e8f2] bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr_1fr_1fr_.8fr_auto] xl:items-end">
            <div>
              <label className="mb-2 block text-[11px] font-semibold text-[#273b5d]">
                Pencarian
              </label>

              <div className="flex h-[42px] items-center rounded-xl border border-[#dce4ef] bg-white px-3.5 transition focus-within:border-[#1666c5] focus-within:ring-2 focus-within:ring-[#1666c5]/10">
                <Search size={16} className="mr-2.5 text-[#7890ad]" />

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari nama dokumen, nomor, program, PIC..."
                  className="w-full bg-transparent text-[11px] text-[#233b62] outline-none placeholder:text-[#9aa9bc]"
                />
              </div>
            </div>

            <ArchiveSelect
              label="Program"
              value={selectedProgram}
              onChange={(value) => {
                setSelectedProgram(value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Semua Program' },
                ...programOptions.map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />

            <ArchiveSelect
              label="Tahapan"
              value={selectedStage}
              onChange={(value) => {
                setSelectedStage(value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Semua Tahapan' },
                ...stageOptions.map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />

            <ArchiveSelect
              label="Jenis Dokumen"
              value={selectedType}
              onChange={(value) => {
                setSelectedType(value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Semua Jenis' },
                ...typeOptions.map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />

            <ArchiveSelect
              label="Tahun"
              value={selectedYear}
              onChange={(value) => {
                setSelectedYear(value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Semua Tahun' },
                ...yearOptions.map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl border border-[#d9e2ee] bg-white px-4 text-[11px] font-semibold text-[#203859] transition hover:bg-[#f8fafc]"
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          </div>
        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-[18px] border border-[#e0e7f0] bg-white shadow-[0_4px_18px_rgba(15,35,68,0.035)]">
          <div className="flex flex-col gap-2 border-b border-[#e7edf5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-bold tracking-[-0.02em] text-[#13294b]">
                Daftar Arsip Dokumen
              </h2>

              <p className="mt-1 text-[10px] text-[#788aa4]">
                Dokumen dihimpun dari seluruh program, task, dan sub-task.
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-semibold text-blue-700">
              {filteredDocuments.length} dokumen ditemukan
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] border-collapse">
              <thead>
                <tr className="border-b border-[#e9eef5] bg-[#fbfcfe]">
                  <TableHeader>NO</TableHeader>
                  <TableHeader>ID DOKUMEN</TableHeader>
                  <TableHeader>NAMA DOKUMEN</TableHeader>
                  <TableHeader>PROGRAM</TableHeader>
                  <TableHeader>TAHAPAN</TableHeader>
                  <TableHeader>JENIS DOKUMEN</TableHeader>
                  <TableHeader>NO DOKUMEN</TableHeader>
                  <TableHeader>TANGGAL DOKUMEN</TableHeader>
                  <TableHeader>UPLOADER</TableHeader>
                  <TableHeader>TANGGAL UPLOAD</TableHeader>
                  <TableHeader>AKSI</TableHeader>
                </tr>
              </thead>

              <tbody>
                {visibleDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-16 text-center">
                      <FileText
                        size={30}
                        className="mx-auto text-[#9aacbf]"
                      />

                      <p className="mt-3 text-sm font-semibold text-[#334968]">
                        Belum ada arsip dokumen
                      </p>

                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8a9ab0]">
                        Sistem hanya menampilkan dokumen yang benar-benar
                        tersedia pada data program, task, atau sub-task.
                        Dokumen contoh tidak dibuat otomatis.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleDocuments.map((document, index) => (
                    <tr
                      key={`${document.archiveId}-${index}`}
                      className="border-b border-[#edf1f6] transition last:border-b-0 hover:bg-[#fafcff]"
                    >
                      <TableCell>
                        {(safePage - 1) * ITEMS_PER_PAGE + index + 1}
                      </TableCell>

                      <TableCell>
                        <span className="whitespace-nowrap font-semibold text-[#2b4c76]">
                          {document.archiveId}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[190px] font-semibold leading-[1.45] text-[#142b4d]">
                          {document.name}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[165px] leading-[1.45]">
                          {document.programName}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">
                          {document.stage}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[145px] leading-[1.45]">
                          {document.type}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="whitespace-nowrap">
                          {document.documentNumber}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="whitespace-nowrap">
                          {formatDate(document.documentDate)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[125px]">{document.uploader}</div>
                      </TableCell>

                      <TableCell>
                        <span className="whitespace-nowrap">
                          {formatDate(document.uploadDate, true)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewDocument(document)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ee] bg-white text-[#0865c8] transition hover:bg-blue-50"
                            title="Lihat detail dokumen"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openFile(document)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ee] bg-white text-[#0865c8] transition hover:bg-blue-50"
                            title="Buka dokumen"
                          >
                            <FileText size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadFile(document)}
                            className={`grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ee] bg-white transition ${
                              document.fileUrl
                                ? 'text-[#0865c8] hover:bg-blue-50'
                                : 'text-slate-300'
                            }`}
                            title={
                              document.fileUrl
                                ? 'Download dokumen'
                                : 'File belum memiliki URL download'
                            }
                          >
                            <Download size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPreviewDocument(document)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#dce4ee] bg-white text-[#506884] transition hover:bg-[#f8fafc]"
                            title="Menu dokumen"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <footer className="flex flex-col gap-4 border-t border-[#e7edf4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-[#7589a4]">
              Menampilkan{' '}
              {filteredDocuments.length === 0
                ? 0
                : (safePage - 1) * ITEMS_PER_PAGE + 1}{' '}
              -{' '}
              {Math.min(
                safePage * ITEMS_PER_PAGE,
                filteredDocuments.length,
              )}{' '}
              dari {filteredDocuments.length} data
            </p>

            <div className="flex items-center gap-1.5">
              <PaginationButton
                disabled={safePage === 1}
                onClick={() => setPage(Math.max(1, safePage - 1))}
              >
                <ChevronLeft size={14} />
              </PaginationButton>

              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter(
                  (pageNumber) =>
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    Math.abs(pageNumber - safePage) <= 1,
                )
                .map((pageNumber, index, pages) => {
                  const previous = pages[index - 1];
                  const showGap =
                    previous !== undefined && pageNumber - previous > 1;

                  return (
                    <React.Fragment key={pageNumber}>
                      {showGap && (
                        <span className="px-1 text-[10px] text-slate-400">
                          …
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`h-8 min-w-8 rounded-lg border px-2 text-[10px] font-semibold transition ${
                          safePage === pageNumber
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    </React.Fragment>
                  );
                })}

              <PaginationButton
                disabled={safePage === totalPages}
                onClick={() =>
                  setPage(Math.min(totalPages, safePage + 1))
                }
              >
                <ChevronRight size={14} />
              </PaginationButton>
            </div>
          </footer>
        </section>
      </div>

      {/* DETAIL MODAL */}
      {previewDocument && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-[#102448]">
                  Detail Arsip Dokumen
                </h3>
                <p className="mt-1 text-[10px] text-slate-400">
                  {previewDocument.archiveId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <DetailField label="Nama Dokumen" value={previewDocument.name} />
              <DetailField label="Jenis Dokumen" value={previewDocument.type} />
              <DetailField label="Program" value={previewDocument.programName} />
              <DetailField label="Tahapan" value={previewDocument.stage} />
              <DetailField
                label="Nomor Dokumen"
                value={previewDocument.documentNumber}
              />
              <DetailField
                label="Tanggal Dokumen"
                value={formatDate(previewDocument.documentDate)}
              />
              <DetailField label="Uploader" value={previewDocument.uploader} />
              <DetailField
                label="Tanggal Upload"
                value={formatDate(previewDocument.uploadDate, true)}
              />
              <DetailField
                label="Nama File"
                value={previewDocument.fileName || '-'}
                wide
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="h-9 rounded-lg border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>

              {previewDocument.fileUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => openFile(previewDocument)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Eye size={14} />
                    Buka File
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadFile(previewDocument)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-[11px] font-semibold text-white hover:bg-blue-700"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ArchiveSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold text-[#273b5d]">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[42px] w-full rounded-xl border border-[#dce4ef] bg-white px-3 text-[11px] text-[#233b62] outline-none transition focus:border-[#1666c5] focus:ring-2 focus:ring-[#1666c5]/10"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-[8px] font-bold uppercase tracking-[0.05em] text-[#71839c]">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-[10px] text-[#5d708b]">{children}</td>
  );
}

function PaginationButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function DetailField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 break-words text-[11px] font-semibold text-slate-700">
        {value || '-'}
      </p>
    </div>
  );
}