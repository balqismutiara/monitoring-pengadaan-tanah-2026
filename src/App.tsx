import React, { useMemo, useState } from 'react';
import { INITIAL_PROGRAMS } from './data';
import { calculateDashboardStats } from './utils';
import { MetricCard } from './components/MetricCard';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { MasterData } from './components/MasterData';
import ReportsAnalytics from './components/ReportsAnalytics';
import { ProgramManagement } from './components/ProgramManagement';
import { ArchiveDocuments } from './components/ArchiveDocuments';
import { ChecklistStages } from './components/ChecklistStages';
import { LoginPage } from './components/LoginPage';
import {
  PELINDO_LOGO
} from './branding';
import {
  SettingsPage,
  type UserProfile
} from './components/SettingsPage';
import {
  AppNotification,
  buildNotifications,
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationBell,
  NotificationCenter,
  NotificationSettings,
  NOTIFICATION_REFERENCE_DATE
} from './components/Notifications';


import {
  AlertCircle,
  BarChart4,
  Bell,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  Database,
  FolderKanban,
  FolderOpen,
  ListTodo,
  LogOut,
  Percent,
  Send,
  Settings2,
  Sparkles,
  X
} from 'lucide-react';

type ActiveTab =
  | 'dashboard'
  | 'management'
  | 'archive'
  | 'checklist'
  | 'notifications'
  | 'analytics'
  | 'master'
  | 'settings';

const DEFAULT_USER: UserProfile = {
  id: 'user-staff-001',
  name: 'Staf Pengadaan Tanah',
  email: 'staff@landmonitor.id',
  role: 'Staf',
  unit: 'Pengadaan Tanah',
  phone: ''
};

const getInitials = (name: string) => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return (
    words
      .map(word => word[0]?.toUpperCase())
      .join('') || 'S'
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentUser, setCurrentUser] =
    useState<UserProfile>(DEFAULT_USER);

  const [programs, setPrograms] = useState(INITIAL_PROGRAMS);

  const [activeTab, setActiveTab] =
    useState<ActiveTab>('dashboard');

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const stats = useMemo(() => {
    return calculateDashboardStats(programs);
  }, [programs]);

  const generatedNotifications = useMemo(
    () => buildNotifications(programs),
    [programs]
  );

  const [
    notificationSettings,
    setNotificationSettings
  ] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );

  const [
    notificationReadState,
    setNotificationReadState
  ] = useState<Record<string, boolean>>({});

  const [
    notificationDrawerOpen,
    setNotificationDrawerOpen
  ] = useState(false);

  const [assistantOpen, setAssistantOpen] =
    useState(false);

  const notifications = useMemo(() => {
    return generatedNotifications
      .filter(
        notification =>
          notificationSettings[notification.type]
      )
      .map(notification => ({
        ...notification,
        read:
          notificationReadState[notification.id] ??
          notification.read
      }));
  }, [
    generatedNotifications,
    notificationSettings,
    notificationReadState
  ]);

  const unreadNotificationCount = useMemo(
    () =>
      notifications.filter(
        notification => !notification.read
      ).length,
    [notifications]
  );

  const markNotificationRead = (id: string) => {
    setNotificationReadState(previous => ({
      ...previous,
      [id]: true
    }));
  };

  const markAllNotificationsRead = () => {
    setNotificationReadState(previous => {
      const next = { ...previous };

      notifications.forEach(notification => {
        next[notification.id] = true;
      });

      return next;
    });
  };

  const openNotification = (
    notification: AppNotification
  ) => {
    markNotificationRead(notification.id);
    setNotificationDrawerOpen(false);
    setActiveTab(notification.targetTab);
  };

  const [chatInput, setChatInput] = useState('');

  const [chatMessages, setChatMessages] = useState<
    Array<{
      sender: 'user' | 'ai';
      text: string;
    }>
  >([
    {
      sender: 'ai',
      text:
        'Halo! Saya adalah Asisten Monitoring Pengadaan Tanah. Anda dapat menanyakan ringkasan status, PIC, keterlambatan, atau rekomendasi tindak lanjut.'
    }
  ]);

  const handleSendMessage = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    const userMessage = chatInput;

    setChatMessages(previousMessages => [
      ...previousMessages,
      {
        sender: 'user',
        text: userMessage
      }
    ]);

    setChatInput('');

    setTimeout(() => {
      let replyText = '';

      const lowerMessage = userMessage.toLowerCase();

      if (
        lowerMessage.includes('status') ||
        lowerMessage.includes('progres') ||
        lowerMessage.includes('progress')
      ) {
        replyText =
          `Status progres keseluruhan adalah ${stats.overallProgress}%. ` +
          `Terdapat ${stats.totalPrograms} program utama, ` +
          `${stats.totalTasks} task, dan ${stats.totalSubTasks} subtask. ` +
          `Sebanyak ${stats.overdueTasksCount} subtask terdeteksi terlambat.`;
      } else if (
        lowerMessage.includes('terlambat') ||
        lowerMessage.includes('telat') ||
        lowerMessage.includes('overdue')
      ) {
        replyText =
          `Saat ini terdapat ${stats.overdueTasksCount} subtask terlambat. ` +
          `Hambatan utama perlu dilihat pada program yang memiliki target terlewati dan status belum selesai.`;
      } else if (
        lowerMessage.includes('pic') ||
        lowerMessage.includes('tanggung jawab') ||
        lowerMessage.includes('petugas')
      ) {
        replyText =
          'Tanggung jawab tersebar kepada beberapa PIC. Detail progres setiap PIC dapat dilihat pada grafik Progres per PIC.';
      } else if (
        lowerMessage.includes('rekomendasi') ||
        lowerMessage.includes('saran') ||
        lowerMessage.includes('solusi')
      ) {
        replyText =
          'Rekomendasi utama adalah memprioritaskan task overdue, mengadakan koordinasi dengan PIC terkait, serta memperbarui target dan hambatan secara berkala.';
      } else {
        replyText =
          `Berdasarkan data saat ini, progres keseluruhan berada pada ${stats.overallProgress}%. ` +
          `Silakan tanyakan progres, task terlambat, PIC, atau rekomendasi.`;
      }

      setChatMessages(previousMessages => [
        ...previousMessages,
        {
          sender: 'ai',
          text: replyText
        }
      ]);
    }, 600);
  };

  const progressColor =
    stats.overallProgress >= 70
      ? 'emerald'
      : stats.overallProgress >= 45
        ? 'blue'
        : 'amber';

  const userInitials = getInitials(currentUser.name);

  const headerReferenceDate = useMemo(() => {
    const date = new Date(NOTIFICATION_REFERENCE_DATE);

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }, []);

  const pageTitles: Record<
    ActiveTab,
    {
      title: string;
      subtitle: string;
    }
  > = {
    dashboard: {
      title: 'Dashboard Monitoring Pengadaan Tanah',
      subtitle:
        'Ringkasan kondisi dan progres pelaksanaan pengadaan tanah secara keseluruhan.'
    },
    management: {
      title: 'Manajemen Monitoring Pengadaan Tanah',
      subtitle:
        'Kelola program, task, sub-task, progres, dan dokumen pensertipikatan.'
    },
    archive: {
      title: 'Arsip Dokumen',
      subtitle:
        'Pusat penyimpanan dan pencarian dokumen pengadaan tanah.'
    },
    checklist: {
      title: 'Checklist Tahapan',
      subtitle:
        'Pantau kelengkapan dokumen wajib pada setiap tahapan pengadaan tanah.'
    },
    notifications: {
      title: 'Notifikasi',
      subtitle:
        'Informasi dan pengingat terkait pekerjaan pengadaan tanah.'
    },
    analytics: {
      title: 'Laporan & Analitik',
      subtitle:
        'Analisis kinerja program pengadaan tanah untuk mendukung pengambilan keputusan strategis.'
    },
    master: {
      title: 'Master Data',
      subtitle:
        'Kelola data program, task list, dan sub task list secara terpusat.'
    },
    settings: {
      title: 'Pengaturan Akun',
      subtitle:
        'Kelola profil pribadi, foto akun, informasi unit kerja, dan keamanan akun.'
    }
  };

  const menuItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart4
    },
    {
      id: 'management',
      label: 'Manajemen Monitoring Pengadaan Tanah',
      icon: FolderKanban
    },
    {
      id: 'archive',
      label: 'Arsip Dokumen',
      icon: FolderOpen
    },
    {
      id: 'checklist',
      label: 'Checklist Tahapan',
      icon: ClipboardCheck
    },
    {
      id: 'notifications',
      label: 'Notifikasi',
      icon: Bell
    },
    {
      id: 'analytics',
      label: 'Laporan & Analitik',
      icon: BarChart4
    },
    {
      id: 'master',
      label: 'Master Data',
      icon: Database
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: Settings2
    }
  ];

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={profile => {
          setCurrentUser(profile);
          setActiveTab('dashboard');
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#102448] antialiased">
      {/* SIDEBAR */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen flex-col
          bg-gradient-to-b from-[#063A70] via-[#06477F] to-[#03315F]
          text-white
          shadow-[10px_0_34px_rgba(3,49,95,0.13)]
          transition-all duration-300
          ${
            sidebarCollapsed
              ? 'w-[86px]'
              : 'w-[250px]'
          }
        `}
      >
        {/* Brand Pelindo + nama sistem */}
        <div
          className={`
            flex min-h-[118px] items-center
            border-b border-white/10
            px-5 py-5
            ${
              sidebarCollapsed
                ? 'justify-center'
                : 'justify-start'
            }
          `}
        >
          <div
            className={`
              min-w-0
              ${
                sidebarCollapsed
                  ? 'flex justify-center'
                  : ''
              }
            `}
          >
            <img
              src={PELINDO_LOGO}
              alt="Pelindo"
              className={`
                h-auto object-contain
                drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]
                ${
                  sidebarCollapsed
                    ? 'w-[52px]'
                    : 'w-[118px]'
                }
              `}
            />

            {!sidebarCollapsed && (
              <div className="mt-3">
                <p
                  className="
                    max-w-[190px]
                    text-[12px] font-extrabold
                    leading-[1.25] text-white
                  "
                >
                  Monitoring
                  <br />
                  Pengadaan Tanah
                </p>

                <p
                  className="
                    mt-1 text-[8.5px]
                    text-blue-100/65
                  "
                >
                  Pelindo · Head Office
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tombol collapse */}
        <button
          type="button"
          onClick={() =>
            setSidebarCollapsed(previous => !previous)
          }
          aria-label={
            sidebarCollapsed
              ? 'Perbesar sidebar'
              : 'Perkecil sidebar'
          }
          className="
            absolute -right-3 top-[88px]
            grid h-7 w-7 place-items-center
            rounded-full border border-[#DCE6F2]
            bg-white text-[#0B4F96]
            shadow-md transition
            hover:bg-[#F4F8FC]
          "
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Menu navigasi */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1.5">
            {menuItems.map(menuItem => {
              const MenuIcon = menuItem.icon;
              const isActive =
                activeTab === menuItem.id;

              return (
                <button
                  key={menuItem.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(menuItem.id)
                  }
                  title={
                    sidebarCollapsed
                      ? menuItem.label
                      : undefined
                  }
                  className={`
                    relative flex w-full items-center
                    gap-3 px-5 py-3
                    text-left text-[12px] font-medium
                    transition-all duration-200
                    ${
                      sidebarCollapsed
                        ? 'justify-center px-0'
                        : ''
                    }
                    ${
                      isActive
                        ? `
                          mx-3 rounded-xl
                          bg-gradient-to-r
                          from-[#0B67C8] to-[#0A73D3]
                          px-3 text-white
                          shadow-[0_8px_18px_rgba(2,78,151,0.28)]
                        `
                        : `
                          text-blue-50/88
                          hover:bg-white/8
                          hover:text-white
                        `
                    }
                  `}
                >
                  <MenuIcon
                      className={`
                      h-[18px] w-[18px] shrink-0
                      ${
                        isActive
                          ? 'text-white'
                          : 'text-blue-100'
                      }
                    `}
                  />

                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1">
                        {menuItem.label}
                      </span>

                      {menuItem.id === 'notifications' &&
                        unreadNotificationCount > 0 && (
                          <span
                            className="
                              grid h-[18px] min-w-[18px]
                              place-items-center rounded-full
                              bg-red-500 px-1
                              text-[8px] font-bold text-white
                            "
                          >
                            {unreadNotificationCount > 99
                              ? '99+'
                              : unreadNotificationCount}
                          </span>
                        )}
                    </>
                  )}

                  {sidebarCollapsed &&
                    menuItem.id === 'notifications' &&
                    unreadNotificationCount > 0 && (
                      <span className="absolute right-4 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#083b6c] bg-red-500" />
                    )}
                </button>
              );
            })}
          </div>
        </nav>
        {/* PROFIL SIDEBAR + LOGOUT */}
        <div className="mt-auto border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`
              mb-2 flex w-full items-center gap-3
              rounded-2xl border border-white/10
              bg-white/[0.07] p-3 text-left
              shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
              transition hover:bg-white/10
              ${
                sidebarCollapsed
                  ? 'justify-center px-0'
                  : ''
              }
            `}
            title={
              sidebarCollapsed
                ? 'Pengaturan Profil'
                : undefined
            }
          >
            <div
              className="
                grid h-10 w-10 shrink-0
                place-items-center overflow-hidden
                rounded-full bg-white
                text-[11px] font-extrabold
                text-[#0B5AC7]
              "
            >
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitials
              )}
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-white">
                  {currentUser.name}
                </p>
                <p className="mt-0.5 truncate text-[9px] text-blue-100/70">
                  {currentUser.role}
                </p>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setNotificationDrawerOpen(false);
              setAssistantOpen(false);
              setIsLoggedIn(false);
            }}
            className={`
              flex w-full items-center
              gap-3 rounded-xl
              px-3 py-3
              text-[13px] font-semibold
              text-blue-50/85
              transition
              hover:bg-white/10
              hover:text-white
              ${
                sidebarCollapsed
                  ? 'justify-center'
                  : ''
              }
            `}
          >
            <LogOut className="h-[18px] w-[18px]" />

            {!sidebarCollapsed && (
              <span>Keluar</span>
            )}
          </button>
        </div>
      </aside>

      {/* AREA KANAN */}
      <div
        className={`
          min-h-screen transition-all duration-300
          ${
            sidebarCollapsed
              ? 'ml-[86px]'
              : 'ml-[250px]'
          }
        `}
      >
        {/* HEADER */}
        <header
          className="
            flex min-h-[104px]
            items-center justify-between
            border-b border-[#E7EEF6]
            bg-white/95
            px-8 py-5
            shadow-[0_4px_18px_rgba(15,53,92,0.035)]
            backdrop-blur
          "
        >
          <div>
            {activeTab === 'dashboard' && (
              <p className="mb-1 text-[10px] font-semibold text-[#0A66C2]">
                Selamat Datang, {currentUser.name}!
              </p>
            )}

            <h1 className="text-[24px] font-extrabold tracking-tight text-[#0A295C]">
              {pageTitles[activeTab].title}
            </h1>

            <p className="mt-1.5 text-[12px] text-slate-500">
              {pageTitles[activeTab].subtitle}
            </p>
          </div>

          <div className="flex items-center gap-5">
            {/* Quick Notification */}
            <NotificationBell
              open={notificationDrawerOpen}
              notifications={notifications}
              unreadCount={unreadNotificationCount}
              onToggle={() =>
                setNotificationDrawerOpen(
                  previous => !previous
                )
              }
              onClose={() =>
                setNotificationDrawerOpen(false)
              }
              onRead={markNotificationRead}
              onReadAll={markAllNotificationsRead}
              onOpenAll={() => {
                setNotificationDrawerOpen(false);
                setActiveTab('notifications');
              }}
              onOpenNotification={openNotification}
            />

            <div
              className="
                hidden h-10 items-center gap-2
                rounded-xl border border-slate-200
                bg-white px-3
                text-[10px] font-semibold text-[#0B2A63]
                shadow-sm md:flex
              "
              title="Tanggal referensi data prototype"
            >
              <CalendarDays className="h-4 w-4 text-blue-600" />
              {headerReferenceDate}
            </div>

            <div className="h-10 w-px bg-slate-200" />
            {/* Profil user */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="
                flex items-center gap-3 rounded-2xl
                border border-transparent
                px-2.5 py-1.5 text-left
                transition
                hover:border-[#E3ECF6]
                hover:bg-[#F8FBFE]
              "
              title="Buka Pengaturan Profil"
            >
              <div className="text-right">
                <p className="max-w-[150px] truncate text-[12px] font-bold text-slate-700">
                  {currentUser.name}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  {currentUser.role}
                </p>
              </div>

              <div
                className="
                  grid h-10 w-10
                  place-items-center overflow-hidden
                  rounded-full bg-gradient-to-br
                  from-[#0A58AC] to-[#0878D0]
                  text-[11px] font-bold text-white
                  shadow-sm
                "
              >
                {currentUser.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </div>
            </button>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="space-y-7 bg-[#F4F7FB] px-8 py-6">
          {/* KPI CARDS - hanya Dashboard & Manajemen */}
          {(activeTab === 'dashboard' || activeTab === 'management') && (
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
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
              subtext="Melewati Target Tanggal"
              color="rose"
            />

            <MetricCard
              id="met-risk"
              title="Program Berisiko"
              value={stats.atRiskProgramsCount}
              icon={AlertCircle}
              subtext="Penundaan Kritis"
              color="amber"
            />
          </section>
          )}

          {/* KONTEN TAB */}
          <section className="space-y-6">
            {activeTab === 'dashboard' && (
              <MonitoringDashboard
                programs={programs}
                stats={stats}
              />
            )}

            {activeTab === 'management' && (
              <ProgramManagement
                programs={programs}
                setPrograms={setPrograms}
              />
            )}

            {activeTab === 'archive' && (
              <ArchiveDocuments programs={programs} />
            )}

            {activeTab === 'checklist' && (
              <ChecklistStages programs={programs} />
            )}

            {activeTab === 'notifications' && (
              <NotificationCenter
                notifications={notifications}
                settings={notificationSettings}
                onSettingsChange={setNotificationSettings}
                onRead={markNotificationRead}
                onReadAll={markAllNotificationsRead}
                onOpenNotification={openNotification}
              />
            )}

            {activeTab === 'analytics' && (
              <ReportsAnalytics programs={programs} />
            )}

            {activeTab === 'master' && (
              <MasterData
                programs={programs}
                setPrograms={setPrograms}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPage
                profile={currentUser}
                onProfileChange={setCurrentUser}
              />
            )}
          </section>

        </main>

        {/* FLOATING ASSISTANT */}
        <div className="fixed bottom-6 right-6 z-[60]">
          {assistantOpen && (
            <div
              className="
                mb-3 w-[360px] max-w-[calc(100vw-32px)]
                overflow-hidden rounded-2xl
                border border-slate-200
                bg-white shadow-2xl
              "
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Sparkles className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-[11px] font-extrabold text-[#0B2A63]">
                      Asisten Monitoring Pengadaan Tanah
                    </p>
                    <p className="text-[8px] text-slate-400">
                      Tanya progress, overdue, PIC, atau rekomendasi
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[280px] min-h-[190px] space-y-2 overflow-y-auto bg-slate-50/60 p-3">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.sender === 'user'
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <div
                      className={`
                        max-w-[85%] rounded-2xl px-3 py-2
                        text-[10px] leading-4
                        ${
                          message.sender === 'user'
                            ? 'rounded-br-md bg-blue-600 text-white'
                            : 'rounded-bl-md border border-slate-100 bg-white text-slate-600'
                        }
                      `}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setChatInput(
                      'Bagaimana status progres keseluruhan saat ini?'
                    )
                  }
                  className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-semibold text-slate-600"
                >
                  Progress
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setChatInput(
                      'Sebutkan subtask yang terhambat atau terlambat!'
                    )
                  }
                  className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-semibold text-slate-600"
                >
                  Overdue
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setChatInput(
                      'Langkah rekomendasi strategis apa selanjutnya?'
                    )
                  }
                  className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-semibold text-slate-600"
                >
                  Rekomendasi
                </button>
              </div>

              <form
                onSubmit={handleSendMessage}
                className="flex gap-2 p-3"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={event =>
                    setChatInput(event.target.value)
                  }
                  placeholder="Tanyakan sesuatu..."
                  className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[9px] text-slate-600 outline-none focus:border-blue-500"
                />

                <button
                  type="submit"
                  className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              setAssistantOpen(previous => !previous)
            }
            className="
              relative grid h-14 w-14 place-items-center
              rounded-full bg-[#083B72]
              text-white shadow-xl
              ring-4 ring-white
              transition hover:scale-105
            "
            aria-label="Buka Asisten Monitoring Pengadaan Tanah"
          >
            <Sparkles className="h-6 w-6" />

            {!assistantOpen && (
              <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-red-500" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
}