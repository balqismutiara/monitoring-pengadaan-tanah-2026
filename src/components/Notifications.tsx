import React, { useMemo, useState } from 'react';
import { CURRENT_DATE_STR } from '../utils';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Info,
  MessageSquare,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';

export type NotificationTargetTab =
  | 'dashboard'
  | 'management'
  | 'archive'
  | 'checklist'
  | 'notifications'
  | 'analytics'
  | 'master';

export type NotificationType =
  | 'document'
  | 'deadline'
  | 'overdue'
  | 'status'
  | 'comment'
  | 'completion';

export type NotificationSeverity =
  | 'critical'
  | 'warning'
  | 'info'
  | 'success';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  programName: string;
  taskName?: string;
  description: string;
  detail?: string;
  createdAt: string;
  targetTab: NotificationTargetTab;
  targetLabel: string;
  read: boolean;
  important: boolean;
}

export interface NotificationSettings {
  document: boolean;
  deadline: boolean;
  overdue: boolean;
  status: boolean;
  comment: boolean;
  completion: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  document: true,
  deadline: true,
  overdue: true,
  status: true,
  comment: true,
  completion: true,
};

// Tanggal acuan = hari ini (sama dengan CURRENT_DATE_STR di utils.ts).
// Saat backend aktif, nilai ini sebaiknya berasal dari server/system time.
export const NOTIFICATION_REFERENCE_DATE = `${CURRENT_DATE_STR}T08:00:00`;

const DAY_MS = 1000 * 60 * 60 * 24;
const PAGE_SIZE = 6;

const getText = (...values: any[]) => {
  const found = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== '',
  );

  return found === undefined || found === null
    ? ''
    : String(found);
};

const getProgramTasks = (program: any) =>
  program?.tasks ||
  program?.taskList ||
  program?.taskLists ||
  program?.children ||
  [];

const getTaskSubTasks = (task: any) =>
  task?.subTasks ||
  task?.subtasks ||
  task?.subTaskList ||
  task?.children ||
  [];

const normalizeStatus = (value?: string) => {
  const status = String(value || 'WIP').trim().toUpperCase();

  if (status === 'SELESAI') return 'DONE';
  if (status === 'TERTUNDA') return 'DELAYED';
  if (status === 'PROSES') return 'WIP';
  if (status === 'BELUM MULAI') return 'NOT_STARTED';

  return status;
};

const parseDate = (value?: string) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoAtNoon = (value?: string) => {
  const date = parseDate(value);
  if (!date) return NOTIFICATION_REFERENCE_DATE;

  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

const formatNotificationDate = (value: string) => {
  const date = parseDate(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatNotificationTime = (value: string) => {
  const date = parseDate(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const getDocuments = (source: any) =>
  source?.documents || source?.dokumen || [];

const hasDocumentFile = (document: any) =>
  Boolean(
    getText(
      document?.fileName,
      document?.filename,
      document?.file?.name,
      document?.fileUrl,
      document?.url,
      document?.downloadUrl,
      document?.webViewLink,
    ),
  );

const generateDocumentNotifications = ({
  source,
  programName,
  taskName,
  sourceId,
}: {
  source: any;
  programName: string;
  taskName?: string;
  sourceId: string;
}): AppNotification[] => {
  const documents = getDocuments(source);

  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  const missingRequired = documents.filter(
    (document: any) =>
      document &&
      document?.required !== false &&
      !hasDocumentFile(document),
  );

  if (missingRequired.length === 0) return [];

  return [
    {
      id: `document-missing-${sourceId}`,
      type: 'document',
      severity: 'warning',
      title: 'Dokumen belum lengkap',
      programName,
      taskName,
      description: `${missingRequired.length} dokumen wajib belum tersedia`,
      detail:
        'Lengkapi dokumen wajib untuk mencegah keterlambatan tahapan berikutnya.',
      createdAt: NOTIFICATION_REFERENCE_DATE,
      targetTab: 'checklist',
      targetLabel: 'Buka Checklist Tahapan',
      read: false,
      important: true,
    },
  ];
};

export function buildNotifications(
  programs: any[] = [],
): AppNotification[] {
  const referenceDate = new Date(NOTIFICATION_REFERENCE_DATE);
  const notifications: AppNotification[] = [];

  programs.forEach((program, programIndex) => {
    const programId = getText(
      program?.id,
      program?.programId,
      `program-${programIndex}`,
    );

    const programName = getText(
      program?.name,
      program?.programName,
      program?.title,
      `Program ${programIndex + 1}`,
    );

    notifications.push(
      ...generateDocumentNotifications({
        source: program,
        programName,
        sourceId: programId,
      }),
    );

    const tasks = getProgramTasks(program);

    if (!Array.isArray(tasks)) return;

    tasks.forEach((task: any, taskIndex: number) => {
      const taskId = getText(
        task?.id,
        task?.taskId,
        `${programId}-task-${taskIndex}`,
      );

      const taskName = getText(
        task?.name,
        task?.taskName,
        task?.title,
        `Task ${taskIndex + 1}`,
      );

      notifications.push(
        ...generateDocumentNotifications({
          source: task,
          programName,
          taskName,
          sourceId: `${programId}-${taskId}`,
        }),
      );

      const subTasks = getTaskSubTasks(task);

      if (!Array.isArray(subTasks)) return;

      subTasks.forEach((subTask: any, subTaskIndex: number) => {
        const subTaskId = getText(
          subTask?.id,
          subTask?.subTaskId,
          `${taskId}-sub-${subTaskIndex}`,
        );

        const subTaskName = getText(
          subTask?.name,
          subTask?.subTaskName,
          subTask?.title,
          `Sub Task ${subTaskIndex + 1}`,
        );

        const status = normalizeStatus(
          getText(subTask?.status, subTask?.state),
        );

        const targetDateText = getText(
          subTask?.dueDate,
          subTask?.targetDate,
          subTask?.endDate,
          subTask?.tglTarget,
          subTask?.['Tgl Target'],
        );

        const targetDate = parseDate(targetDateText);

        notifications.push(
          ...generateDocumentNotifications({
            source: subTask,
            programName,
            taskName,
            sourceId: `${programId}-${taskId}-${subTaskId}`,
          }),
        );

        // OVERDUE / PEKERJAAN TERLAMBAT
        if (
          status !== 'DONE' &&
          targetDate &&
          referenceDate > targetDate
        ) {
          const overdueDays = Math.max(
            1,
            Math.ceil(
              (referenceDate.getTime() - targetDate.getTime()) /
                DAY_MS,
            ),
          );

          notifications.push({
            id: `overdue-${programId}-${taskId}-${subTaskId}`,
            type: 'overdue',
            severity: 'critical',
            title: 'Pekerjaan terlambat',
            programName,
            taskName,
            description: `${subTaskName} · Terlambat ${overdueDays} hari`,
            detail:
              getText(
                subTask?.notes,
                subTask?.hambatan,
                subTask?.keterangan,
                subTask?.['Hambatan / Keterangan'],
                'Segera lakukan percepatan pekerjaan dan review target.',
              ),
            createdAt: NOTIFICATION_REFERENCE_DATE,
            targetTab: 'management',
            targetLabel: 'Buka Manajemen Monitoring',
            read: false,
            important: true,
          });
        }

        // TARGET MENDEKATI BATAS WAKTU
        if (
          status !== 'DONE' &&
          targetDate &&
          referenceDate <= targetDate
        ) {
          const daysLeft = Math.ceil(
            (targetDate.getTime() - referenceDate.getTime()) /
              DAY_MS,
          );

          if (daysLeft >= 0 && daysLeft <= 10) {
            notifications.push({
              id: `deadline-${programId}-${taskId}-${subTaskId}`,
              type: 'deadline',
              severity: 'warning',
              title: 'Target segera berakhir',
              programName,
              taskName,
              description: `${subTaskName} · Target ${formatNotificationDate(
                targetDateText,
              )} (${daysLeft} hari lagi)`,
              detail:
                'Pastikan progres pekerjaan dan kebutuhan dokumen telah diperbarui.',
              createdAt: NOTIFICATION_REFERENCE_DATE,
              targetTab: 'management',
              targetLabel: 'Buka Detail Pekerjaan',
              read: false,
              important: true,
            });
          }
        }

        // STATUS UPDATE — hanya dibuat bila data punya timestamp update.
        const updatedAt = getText(
          subTask?.updatedAt,
          subTask?.statusUpdatedAt,
          subTask?.lastUpdatedAt,
        );

        if (updatedAt) {
          notifications.push({
            id: `status-${programId}-${taskId}-${subTaskId}`,
            type: 'status',
            severity: 'info',
            title: 'Status diperbarui',
            programName,
            taskName,
            description: `${subTaskName} · Status ${status}`,
            detail: `PIC: ${getText(
              subTask?.pic,
              subTask?.PIC,
              '-',
            )}`,
            createdAt: toIsoAtNoon(updatedAt),
            targetTab: 'management',
            targetLabel: 'Buka Pekerjaan',
            read: true,
            important: false,
          });
        }

        // PEKERJAAN / TAHAPAN SELESAI
        if (status === 'DONE') {
          notifications.push({
            id: `completion-${programId}-${taskId}-${subTaskId}`,
            type: 'completion',
            severity: 'success',
            title: 'Pekerjaan selesai',
            programName,
            taskName,
            description: `${subTaskName} · Status DONE`,
            detail:
              'Pekerjaan telah berstatus selesai pada data monitoring.',
            createdAt: toIsoAtNoon(
              getText(
                subTask?.completedAt,
                subTask?.updatedAt,
                targetDateText,
              ),
            ),
            targetTab: 'management',
            targetLabel: 'Lihat Pekerjaan',
            read: true,
            important: false,
          });
        }
      });
    });
  });

  const severityRank: Record<NotificationSeverity, number> = {
    critical: 4,
    warning: 3,
    info: 2,
    success: 1,
  };

  return notifications
    .sort((a, b) => {
      if (severityRank[b.severity] !== severityRank[a.severity]) {
        return severityRank[b.severity] - severityRank[a.severity];
      }

      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    })
    .slice(0, 50);
}

function NotificationIcon({
  notification,
}: {
  notification: AppNotification;
}) {
  const size = 17;

  if (notification.type === 'document') {
    return <FileText size={size} />;
  }

  if (notification.type === 'deadline') {
    return <AlertTriangle size={size} />;
  }

  if (notification.type === 'overdue') {
    return <Clock3 size={size} />;
  }

  if (notification.type === 'comment') {
    return <MessageSquare size={size} />;
  }

  if (notification.type === 'completion') {
    return <CheckCircle2 size={size} />;
  }

  return <Info size={size} />;
}

function notificationTone(
  notification: AppNotification,
) {
  if (notification.severity === 'critical') {
    return {
      icon: 'bg-red-50 text-red-500',
      dot: 'bg-red-500',
      badge: 'bg-red-50 text-red-500',
      badgeLabel: 'Overdue',
    };
  }

  if (notification.severity === 'warning') {
    return {
      icon: 'bg-amber-50 text-amber-500',
      dot: 'bg-red-500',
      badge: 'bg-amber-50 text-amber-600',
      badgeLabel:
        notification.type === 'document'
          ? 'Dokumen'
          : 'Peringatan',
    };
  }

  if (notification.severity === 'success') {
    return {
      icon: 'bg-emerald-50 text-emerald-600',
      dot: 'bg-blue-500',
      badge: 'bg-emerald-50 text-emerald-600',
      badgeLabel: 'Selesai',
    };
  }

  return {
    icon: 'bg-blue-50 text-blue-600',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-600',
    badgeLabel: 'Informasi',
  };
}

export function NotificationBell({
  open,
  notifications,
  unreadCount,
  onToggle,
  onClose,
  onRead,
  onReadAll,
  onOpenAll,
  onOpenNotification,
}: {
  open: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  onToggle: () => void;
  onClose: () => void;
  onRead: (id: string) => void;
  onReadAll: () => void;
  onOpenAll: () => void;
  onOpenNotification: (notification: AppNotification) => void;
}) {
  const preview = notifications.slice(0, 5);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="
          relative grid h-10 w-10 place-items-center
          rounded-full text-slate-500 transition
          hover:bg-white hover:text-[#0B2A63]
        "
        aria-label="Buka notifikasi"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span
            className="
              absolute right-0.5 top-0.5
              grid h-[18px] min-w-[18px]
              place-items-center rounded-full
              bg-red-500 px-1
              text-[9px] font-bold text-white
            "
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup panel notifikasi"
            onClick={onClose}
            className="fixed inset-0 z-[70] cursor-default bg-transparent"
          />

          <div
            className="
              fixed right-6 top-[82px] z-[80]
              w-[390px] max-w-[calc(100vw-24px)]
              overflow-hidden rounded-2xl
              border border-slate-200
              bg-white shadow-2xl
            "
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <div>
                <h3 className="text-[14px] font-extrabold text-[#0B2A63]">
                  Notifikasi
                </h3>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {unreadCount} belum dibaca
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
              >
                <X size={15} />
              </button>
            </div>

            <div className="max-h-[470px] overflow-y-auto">
              {preview.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <BellRing
                    size={28}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-[11px] font-semibold text-slate-600">
                    Tidak ada notifikasi
                  </p>
                </div>
              ) : (
                preview.map((notification) => {
                  const tone = notificationTone(notification);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        onRead(notification.id);
                        onOpenNotification(notification);
                      }}
                      className={`
                        flex w-full gap-3 border-b border-slate-100
                        px-4 py-3.5 text-left transition
                        hover:bg-slate-50
                        ${notification.read ? 'bg-white' : 'bg-blue-50/35'}
                      `}
                    >
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : tone.dot}`}
                      />

                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone.icon}`}
                      >
                        <NotificationIcon
                          notification={notification}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10.5px] font-bold text-[#0B2A63]">
                          {notification.title}
                        </p>
                        <p className="mt-1 truncate text-[9px] text-slate-500">
                          {notification.description}
                        </p>
                        <p className="mt-1 text-[8px] text-slate-400">
                          {formatNotificationDate(
                            notification.createdAt,
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 p-3">
              <button
                type="button"
                onClick={onReadAll}
                className="h-9 rounded-lg border border-slate-200 bg-white text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tandai semua dibaca
              </button>

              <button
                type="button"
                onClick={onOpenAll}
                className="h-9 rounded-lg bg-blue-600 text-[9px] font-semibold text-white hover:bg-blue-700"
              >
                Lihat Semua Notifikasi
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

type NotificationTab =
  | 'all'
  | 'unread'
  | 'important'
  | 'completed';

const TYPE_OPTIONS: Array<{
  value: 'ALL' | NotificationType;
  label: string;
}> = [
  { value: 'ALL', label: 'Semua Jenis' },
  { value: 'document', label: 'Dokumen' },
  { value: 'deadline', label: 'Target Mendekat' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'status', label: 'Status' },
  { value: 'comment', label: 'Komentar' },
  { value: 'completion', label: 'Selesai' },
];

const SETTINGS_COPY: Array<{
  key: keyof NotificationSettings;
  title: string;
  description: string;
}> = [
  {
    key: 'document',
    title: 'Dokumen belum lengkap',
    description:
      'Notifikasi ketika dokumen wajib belum tersedia',
  },
  {
    key: 'deadline',
    title: 'Target mendekati batas waktu',
    description:
      'Notifikasi ketika target akan segera berakhir',
  },
  {
    key: 'overdue',
    title: 'Target terlewati (overdue)',
    description:
      'Notifikasi ketika pekerjaan melewati target',
  },
  {
    key: 'status',
    title: 'Status diperbarui',
    description:
      'Notifikasi ketika status atau progress diperbarui',
  },
  {
    key: 'comment',
    title: 'Komentar baru',
    description:
      'Notifikasi ketika ada komentar baru',
  },
  {
    key: 'completion',
    title: 'Tahapan selesai',
    description:
      'Notifikasi ketika tahapan/pekerjaan selesai',
  },
];

export function NotificationCenter({
  notifications,
  settings,
  onSettingsChange,
  onRead,
  onReadAll,
  onOpenNotification,
}: {
  notifications: AppNotification[];
  settings: NotificationSettings;
  onSettingsChange: (
    next: NotificationSettings,
  ) => void;
  onRead: (id: string) => void;
  onReadAll: () => void;
  onOpenNotification: (
    notification: AppNotification,
  ) => void;
}) {
  const [tab, setTab] = useState<NotificationTab>('all');
  const [typeFilter, setTypeFilter] = useState<
    'ALL' | NotificationType
  >('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const unreadCount = notifications.filter(
    (item) => !item.read,
  ).length;

  const importantCount = notifications.filter(
    (item) => item.important,
  ).length;

  const completedCount = notifications.filter(
    (item) => item.type === 'completion',
  ).length;

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const tabMatch =
        tab === 'all' ||
        (tab === 'unread' && !item.read) ||
        (tab === 'important' && item.important) ||
        (tab === 'completed' &&
          item.type === 'completion');

      const typeMatch =
        typeFilter === 'ALL' || item.type === typeFilter;

      const searchMatch =
        !keyword ||
        [
          item.title,
          item.programName,
          item.taskName,
          item.description,
          item.detail,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(keyword);

      return tabMatch && typeMatch && searchMatch;
    });
  }, [notifications, search, tab, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const tabs: Array<{
    id: NotificationTab;
    label: string;
    count?: number;
  }> = [
    {
      id: 'all',
      label: 'Semua',
      count: notifications.length,
    },
    {
      id: 'unread',
      label: 'Belum Dibaca',
      count: unreadCount,
    },
    {
      id: 'important',
      label: 'Penting',
      count: importantCount,
    },
    {
      id: 'completed',
      label: 'Selesai',
      count: completedCount,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* LIST */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5">
          <div className="flex flex-wrap gap-6">
            {tabs.map((item) => {
              const active = tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setPage(1);
                  }}
                  className={`
                    relative flex h-14 items-center gap-2
                    text-[11px] font-semibold
                    ${
                      active
                        ? 'text-blue-600'
                        : 'text-slate-500'
                    }
                  `}
                >
                  {item.label}

                  {!!item.count && (
                    <span
                      className={`
                        grid min-w-[19px] place-items-center
                        rounded-full px-1.5 py-0.5
                        text-[8px] font-bold
                        ${
                          active
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }
                      `}
                    >
                      {item.count}
                    </span>
                  )}

                  {active && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 md:grid-cols-[170px_1fr_auto]">
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(
                event.target.value as
                  | 'ALL'
                  | NotificationType,
              );
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 outline-none focus:border-blue-500"
          >
            {TYPE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Cari notifikasi..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-9 text-[10px] text-slate-600 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTypeFilter('ALL');
              setTab('all');
              setPage(1);
            }}
            title="Reset filter"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-2">
            {visible.length === 0 ? (
              <div className="py-16 text-center">
                <BellRing
                  size={30}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-3 text-[11px] font-semibold text-slate-600">
                  Tidak ada notifikasi
                </p>
                <p className="mt-1 text-[9px] text-slate-400">
                  Tidak ada data yang cocok dengan filter ini.
                </p>
              </div>
            ) : (
              visible.map((notification) => {
                const tone = notificationTone(notification);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      onRead(notification.id);
                      onOpenNotification(notification);
                    }}
                    className={`
                      grid w-full grid-cols-[8px_44px_minmax(0,1fr)_115px]
                      items-center gap-3 rounded-xl
                      border border-slate-100 px-3 py-3.5
                      text-left transition
                      hover:border-blue-100 hover:bg-blue-50/25
                      ${
                        notification.read
                          ? 'bg-white'
                          : 'bg-blue-50/30'
                      }
                    `}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        notification.read
                          ? 'bg-transparent'
                          : tone.dot
                      }`}
                    />

                    <div
                      className={`grid h-10 w-10 place-items-center rounded-xl ${tone.icon}`}
                    >
                      <NotificationIcon
                        notification={notification}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10.5px] font-extrabold text-[#0B2A63]">
                        {notification.title}
                      </p>

                      <p className="mt-1 truncate text-[9.5px] text-slate-500">
                        {notification.programName}
                        {notification.taskName
                          ? ` · ${notification.taskName}`
                          : ''}
                      </p>

                      <p className="mt-1 truncate text-[9px] text-slate-500">
                        {notification.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] text-slate-500">
                        {formatNotificationDate(
                          notification.createdAt,
                        )}
                      </p>
                      <p className="mt-1 text-[9px] font-semibold text-[#0B2A63]">
                        {formatNotificationTime(
                          notification.createdAt,
                        )}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-md px-2 py-1 text-[7.5px] font-semibold ${tone.badge}`}
                      >
                        {tone.badgeLabel}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9px] text-slate-400">
            Menampilkan{' '}
            {filtered.length === 0
              ? 0
              : (safePage - 1) * PAGE_SIZE + 1}{' '}
            -{' '}
            {Math.min(
              safePage * PAGE_SIZE,
              filtered.length,
            )}{' '}
            dari {filtered.length} notifikasi
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() =>
                setPage(Math.max(1, safePage - 1))
              }
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-blue-600 px-2 text-[10px] font-bold text-white">
              {safePage}
            </span>

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() =>
                setPage(
                  Math.min(totalPages, safePage + 1),
                )
              }
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      </section>

      {/* SETTINGS */}
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[14px] font-extrabold text-[#0B2A63]">
              Pengaturan Notifikasi
            </h2>
          </div>

          <div className="divide-y divide-slate-100 px-5">
            {SETTINGS_COPY.map((item) => {
              const checked = settings[item.key];

              return (
                <div
                  key={item.key}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 py-4"
                >
                  <div>
                    <p className="text-[10.5px] font-bold text-[#0B2A63]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        [item.key]: !checked,
                      })
                    }
                    className={`
                      relative h-6 w-11 rounded-full
                      transition
                      ${
                        checked
                          ? 'bg-blue-600'
                          : 'bg-slate-200'
                      }
                    `}
                  >
                    <span
                      className={`
                        absolute top-1 h-4 w-4 rounded-full
                        bg-white shadow transition
                        ${
                          checked
                            ? 'left-6'
                            : 'left-1'
                        }
                      `}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={onReadAll}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Check size={13} />
              Tandai Semua Dibaca
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <Info
              size={16}
              className="mt-0.5 shrink-0 text-blue-600"
            />
            <div>
              <h3 className="text-[11px] font-bold text-blue-800">
                Informasi
              </h3>
              <p className="mt-1 text-[9px] leading-5 text-blue-700">
                Klik notifikasi untuk langsung menuju modul
                terkait. Pengaturan ini berlaku pada tampilan
                notifikasi dan badge lonceng selama sesi frontend.
                Saat backend selesai, preferensi dapat disimpan per
                user di MySQL.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
