import { useTranslation } from 'react-i18next';
import { tokens } from '@fluentui/react-components';
import {
  BoardRegular,
  BoardFilled,
  TimerRegular,
  TimerFilled,
  CalendarRegular,
  CalendarFilled,
  DataPieRegular,
  DataPieFilled,
  TargetArrowRegular,
  TargetArrowFilled,
  FolderRegular,
  FolderFilled,
  SettingsRegular,
  SettingsFilled,
  NavigationRegular,
  SignOutRegular,
} from '@fluentui/react-icons';
import { useAppStore } from '@/stores/appStore';
import { useTimerStore } from '@/stores/timerStore';
import { useUserStore } from '@/stores/userStore';
import type { NavPage } from '@/types';
import { DashboardPage } from '@/components/Dashboard/DashboardPage';
import { TimerPage } from '@/components/Timer/TimerPage';
import { EntriesPage } from '@/components/Entries/EntriesPage';
import { AnalyticsPage } from '@/components/Analytics/AnalyticsPage';
import { GoalsPage } from '@/components/Goals/GoalsPage';
import { ManagePage } from '@/components/Manage/ManagePage';
import { SettingsPage } from '@/components/Settings/SettingsPage';
import { formatDuration } from '@/utils/helpers';

const navItems: { page: NavPage; icon: React.ReactNode; activeIcon: React.ReactNode; labelKey: string }[] = [
  { page: 'dashboard', icon: <BoardRegular />, activeIcon: <BoardFilled />, labelKey: 'nav.dashboard' },
  { page: 'timer', icon: <TimerRegular />, activeIcon: <TimerFilled />, labelKey: 'nav.timer' },
  { page: 'entries', icon: <CalendarRegular />, activeIcon: <CalendarFilled />, labelKey: 'nav.entries' },
  { page: 'analytics', icon: <DataPieRegular />, activeIcon: <DataPieFilled />, labelKey: 'nav.analytics' },
  { page: 'goals', icon: <TargetArrowRegular />, activeIcon: <TargetArrowFilled />, labelKey: 'nav.goals' },
  { page: 'manage', icon: <FolderRegular />, activeIcon: <FolderFilled />, labelKey: 'nav.manage' },
  { page: 'settings', icon: <SettingsRegular />, activeIcon: <SettingsFilled />, labelKey: 'nav.settings' },
];

const pageComponents: Record<NavPage, React.ComponentType> = {
  dashboard: DashboardPage,
  timer: TimerPage,
  entries: EntriesPage,
  analytics: AnalyticsPage,
  goals: GoalsPage,
  manage: ManagePage,
  settings: SettingsPage,
};

export function AppLayout() {
  const { t } = useTranslation();
  const { currentPage, setPage, isSidebarCollapsed, toggleSidebar } = useAppStore();
  const { status, elapsedSeconds } = useTimerStore();
  const { currentUser, logout } = useUserStore();

  const PageComponent = pageComponents[currentPage];

  return (
    <div className="app-layout" style={{ background: tokens.colorNeutralBackground2 }}>
      {/* Sidebar */}
      <div
        className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
        style={{
          background: tokens.colorNeutralBackground3,
          borderColor: tokens.colorNeutralStroke2,
        }}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div
            className="titlebar-no-drag"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
            onClick={toggleSidebar}
          >
            <NavigationRegular style={{ fontSize: 20 }} />
            {!isSidebarCollapsed && (
              <span style={{ fontWeight: 700, fontSize: 16, color: tokens.colorBrandForeground1 }}>
                ChronoLog
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.page}
              className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
              onClick={() => setPage(item.page)}
              title={isSidebarCollapsed ? t(item.labelKey) : undefined}
              style={{
                color:
                  currentPage === item.page
                    ? tokens.colorBrandForeground1
                    : tokens.colorNeutralForeground2,
              }}
            >
              <span className="nav-icon">
                {currentPage === item.page ? item.activeIcon : item.icon}
              </span>
              {!isSidebarCollapsed && <span>{t(item.labelKey)}</span>}
            </div>
          ))}
        </nav>

        {/* Timer Status in Sidebar */}
        {status !== 'idle' && !isSidebarCollapsed && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              className={status === 'running' ? 'pulse' : ''}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: status === 'running' ? '#10b981' : '#f59e0b',
                flexShrink: 0,
              }}
            />
            <span className="timer-display-small" style={{ fontSize: 16, color: tokens.colorNeutralForeground1 }}>
              {formatDuration(elapsedSeconds)}
            </span>
          </div>
        )}

        {/* User Profile */}
        <div
          style={{
            padding: isSidebarCollapsed ? '12px 0' : '12px 16px',
            borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            gap: 8,
            marginTop: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: currentUser?.avatar_color || '#0078d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {(currentUser?.display_name || currentUser?.name || '?')[0].toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <span
                style={{
                  fontSize: 13,
                  color: tokens.colorNeutralForeground2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentUser?.display_name || currentUser?.name}
              </span>
            )}
          </div>
          {!isSidebarCollapsed && (
            <div
              className="titlebar-no-drag"
              style={{ cursor: 'pointer', color: tokens.colorNeutralForeground3, flexShrink: 0 }}
              onClick={logout}
              title={t('auth.logout')}
            >
              <SignOutRegular style={{ fontSize: 18 }} />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Titlebar (draggable) */}
        <div className="titlebar">
          <div style={{ flex: 1 }} className="titlebar-drag" />
        </div>

        {/* Page Content */}
        <div className="page-content fade-in" key={currentPage}>
          <PageComponent />
        </div>
      </div>
    </div>
  );
}
