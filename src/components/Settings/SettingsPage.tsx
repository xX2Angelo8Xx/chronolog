import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Switch,
  Input,
  Dropdown,
  Option,
  tokens,
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
} from '@fluentui/react-components';
import {
  WeatherMoonRegular,
  WeatherSunnyRegular,
  LocalLanguageRegular,
  KeyboardRegular,
  InfoRegular,
  ArrowDownloadRegular,
  ArrowUploadRegular,
  ArrowSyncRegular,
  DeleteRegular,
  PersonRegular,
  SignOutRegular,
} from '@fluentui/react-icons';
import { useAppStore } from '@/stores/appStore';
import { useUserStore } from '@/stores/userStore';
import type { ThemeMode } from '@/types';

export function SettingsPage() {
  const { t } = useTranslation();
  const { theme, language, settings, setTheme, setLanguage, updateSetting, toggleCommandPalette } = useAppStore();
  const { currentUser, logout, changePassword, deleteUser } = useUserStore();

  const gamificationEnabled = settings.gamification_enabled !== 'false';
  const notificationsEnabled = settings.notifications_enabled !== 'false';
  const coffeeBreakMax = settings.coffee_break_max_minutes || '15';
  const dailyTarget = settings.daily_target_hours || '8';
  const weeklyTarget = settings.weekly_target_hours || '40';
  const pomodoroWork = settings.pomodoro_work_minutes || '25';
  const pomodoroBreak = settings.pomodoro_break_minutes || '5';
  const pomodoroLongBreak = settings.pomodoro_long_break_minutes || '15';
  const pomodoroSessions = settings.pomodoro_sessions_before_long_break || '4';

  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('idle');
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updatePercent, setUpdatePercent] = useState<number>(0);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    window.electronAPI.app.getVersion().then((v: string) => setAppVersion(v));
    const unsub = window.electronAPI.updater.onStatus((data: any) => {
      setUpdateStatus(data.status);
      if (data.version) setUpdateVersion(data.version);
      if (data.percent !== undefined) setUpdatePercent(data.percent);
    });
    return () => unsub();
  }, []);

  const handleChangePassword = async () => {
    setPwdError(null);
    setPwdSuccess(false);
    if (!newPwd) {
      setPwdError(t('auth.passwordRequired'));
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError(t('auth.passwordMismatch'));
      return;
    }
    if (!currentUser) return;
    const ok = await changePassword(currentUser.id, currentPwd, newPwd);
    if (ok) {
      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } else {
      setPwdError(t('auth.wrongPassword'));
    }
  };

  const handleExportData = async () => {
    setExportStatus(null);
    const result = await window.electronAPI.data.export();
    if (result.cancelled) return;
    if (result.success) {
      setExportStatus(t('settings.exportSuccess', { entries: result.stats?.totalEntries ?? 0 }));
    } else {
      setExportStatus(t('common.error') + ': ' + result.error);
    }
  };

  const handleExportCSV = async () => {
    setExportStatus(null);
    const result = await window.electronAPI.data.exportCSV();
    if (result.cancelled) return;
    if (result.success) {
      setExportStatus(t('settings.csvExportSuccess', { count: result.count ?? 0 }));
    } else {
      setExportStatus(t('common.error') + ': ' + result.error);
    }
  };

  const handleImportData = async (mode: 'replace' | 'merge') => {
    setImportStatus(null);
    const result = await window.electronAPI.data.import(mode);
    if (result.cancelled) return;

    const total = result.imported
      ? Object.values(result.imported).reduce((a: number, b: number) => a + b, 0)
      : 0;

    if (result.success) {
      setImportStatus(t('settings.importSuccess', { count: total }));
      window.location.reload();
    } else if (total > 0) {
      // Partial success — some rows imported but there were row-level errors
      setImportStatus(
        t('settings.importSuccess', { count: total }) +
          ' (' + (result.errors?.length ?? 0) + ' warnings: ' +
          (result.errors?.slice(0, 3).join('; ') ?? '') +
          (result.errors && result.errors.length > 3 ? '…' : '') + ')'
      );
      window.location.reload();
    } else {
      setImportStatus(t('common.error') + ': ' + (result.error || result.errors?.join(', ')));
    }
  };

  return (
    <div style={{ maxWidth: 700, width: '100%', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
      </div>

      {/* Profile */}
      <Card style={{ padding: 24, marginBottom: 16, background: tokens.colorNeutralBackground1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          <PersonRegular style={{ marginRight: 8 }} />
          {t('auth.selectProfile')}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            backgroundColor: currentUser?.avatar_color || '#0078d4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 600, color: '#fff',
          }}>
            {(currentUser?.display_name || currentUser?.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {currentUser?.display_name || currentUser?.name}
            </div>
            <div style={{ fontSize: 13, color: tokens.colorNeutralForeground3 }}>
              @{currentUser?.name}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="outline" onClick={() => setShowPasswordDialog(true)}>
            {t('auth.changePassword')}
          </Button>
          <Button appearance="subtle" icon={<SignOutRegular />} onClick={logout}>
            {t('auth.logout')}
          </Button>
        </div>

        {/* Danger Zone - Delete Account */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${tokens.colorPaletteRedBorderActive}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: tokens.colorPaletteRedForeground1 }}>
                {t('settings.deleteAccount', { defaultValue: 'Delete Account' })}
              </div>
              <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginTop: 2 }}>
                {t('settings.deleteAccountDescription', { defaultValue: 'Permanently delete your account and all associated data. This action cannot be undone.' })}
              </div>
            </div>
            <Button
              appearance="primary"
              icon={<DeleteRegular />}
              onClick={() => setShowDeleteDialog(true)}
              style={{ backgroundColor: tokens.colorPaletteRedBackground3, borderColor: tokens.colorPaletteRedBackground3 }}
            >
              {t('settings.deleteAccount', { defaultValue: 'Delete Account' })}
            </Button>
          </div>
        </div>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(_, data) => {
        setShowPasswordDialog(data.open);
        if (!data.open) {
          setCurrentPwd('');
          setNewPwd('');
          setConfirmPwd('');
          setPwdError(null);
          setPwdSuccess(false);
        }
      }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('auth.changePassword')}</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <Input
                  type="password"
                  placeholder={t('auth.currentPassword')}
                  value={currentPwd}
                  onChange={(_, data) => setCurrentPwd(data.value)}
                />
                <Input
                  type="password"
                  placeholder={t('auth.newPassword')}
                  value={newPwd}
                  onChange={(_, data) => setNewPwd(data.value)}
                />
                <Input
                  type="password"
                  placeholder={t('auth.confirmPassword')}
                  value={confirmPwd}
                  onChange={(_, data) => setConfirmPwd(data.value)}
                />
                {pwdError && (
                  <span style={{ color: tokens.colorPaletteRedForeground1, fontSize: 13 }}>{pwdError}</span>
                )}
                {pwdSuccess && (
                  <span style={{ color: tokens.colorPaletteGreenForeground1, fontSize: 13 }}>{t('auth.passwordChanged')}</span>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{t('common.cancel')}</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleChangePassword}>{t('common.save')}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(_, data) => setShowDeleteDialog(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {t('settings.deleteAccount', { defaultValue: 'Delete Account' })}
            </DialogTitle>
            <DialogContent>
              <p style={{ margin: '8px 0', color: tokens.colorNeutralForeground1 }}>
                {t('settings.deleteAccountConfirm', { defaultValue: 'Are you sure you want to permanently delete your account? All your time entries, settings, and data will be lost forever.' })}
              </p>
              <p style={{ margin: '8px 0', fontWeight: 600, color: tokens.colorPaletteRedForeground1 }}>
                {t('settings.deleteAccountWarning', { defaultValue: 'This action cannot be undone!' })}
              </p>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowDeleteDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                appearance="primary"
                icon={<DeleteRegular />}
                onClick={async () => {
                  if (currentUser) {
                    await deleteUser(currentUser.id);
                    setShowDeleteDialog(false);
                  }
                }}
                style={{ backgroundColor: tokens.colorPaletteRedBackground3, borderColor: tokens.colorPaletteRedBackground3 }}
              >
                {t('settings.deleteAccountConfirmButton', { defaultValue: 'Yes, Delete My Account' })}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* General */}
      <Card style={{ padding: 24, marginBottom: 16, background: tokens.colorNeutralBackground1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.general')}</h3>

        {/* Language */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LocalLanguageRegular style={{ fontSize: 20 }} />
            <span>{t('settings.language')}</span>
          </div>
          <Dropdown
            value={language === 'de' ? 'Deutsch' : 'English'}
            selectedOptions={[language]}
            onOptionSelect={(_, data) => setLanguage(data.optionValue as string)}
            style={{ minWidth: 160 }}
          >
            <Option value="de" text="Deutsch">🇩🇪 Deutsch</Option>
            <Option value="en" text="English">🇬🇧 English</Option>
          </Dropdown>
        </div>

        {/* Theme */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {theme === 'dark' ? <WeatherMoonRegular style={{ fontSize: 20 }} /> : <WeatherSunnyRegular style={{ fontSize: 20 }} />}
            <span>{t('settings.theme')}</span>
          </div>
          <Dropdown
            value={theme === 'light' ? t('settings.themeLight') : theme === 'dark' ? t('settings.themeDark') : t('settings.themeSystem')}
            selectedOptions={[theme]}
            onOptionSelect={(_, data) => setTheme(data.optionValue as ThemeMode)}
            style={{ minWidth: 160 }}
          >
            <Option value="light" text={t('settings.themeLight')}>☀️ {t('settings.themeLight')}</Option>
            <Option value="dark" text={t('settings.themeDark')}>🌙 {t('settings.themeDark')}</Option>
            <Option value="system" text={t('settings.themeSystem')}>💻 {t('settings.themeSystem')}</Option>
          </Dropdown>
        </div>

        {/* Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('settings.notificationsEnabled')}</span>
          <Switch
            checked={notificationsEnabled}
            onChange={(_, data) => updateSetting('notifications_enabled', data.checked ? 'true' : 'false')}
          />
        </div>
      </Card>

      {/* Break Rules */}
      <Card style={{ padding: 24, marginBottom: 16, background: tokens.colorNeutralBackground1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.breaks')}</h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span>{t('settings.coffeeBreakMax')}</span>
          <Input
            type="number"
            value={coffeeBreakMax}
            onChange={(_, data) => updateSetting('coffee_break_max_minutes', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>min</span>}
          />
        </div>
        <p style={{ fontSize: 12, color: tokens.colorNeutralForeground3, margin: 0 }}>
          {t('timer.breakInfo')}
        </p>
      </Card>

      {/* Work Targets */}
      <Card style={{ padding: 24, marginBottom: 16, background: tokens.colorNeutralBackground1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.workTargets')}</h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>{t('settings.dailyTarget')}</span>
          <Input
            type="number"
            value={dailyTarget}
            onChange={(_, data) => updateSetting('daily_target_hours', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>h</span>}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('settings.weeklyTarget')}</span>
          <Input
            type="number"
            value={weeklyTarget}
            onChange={(_, data) => updateSetting('weekly_target_hours', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>h</span>}
          />
        </div>
      </Card>

      {/* Pomodoro */}
      <Card style={{ padding: 24, marginBottom: 16, background: tokens.colorNeutralBackground1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.pomodoro')}</h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>{t('settings.pomodoroWork')}</span>
          <Input
            type="number"
            value={pomodoroWork}
            onChange={(_, data) => updateSetting('pomodoro_work_minutes', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>min</span>}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>{t('settings.pomodoroBreak')}</span>
          <Input
            type="number"
            value={pomodoroBreak}
            onChange={(_, data) => updateSetting('pomodoro_break_minutes', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>min</span>}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>{t('pomodoro.longBreak')}</span>
          <Input
            type="number"
            value={pomodoroLongBreak}
            onChange={(_, data) => updateSetting('pomodoro_long_break_minutes', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>min</span>}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('pomodoro.sessions')}</span>
          <Input
            type="number"
            value={pomodoroSessions}
            onChange={(_, data) => updateSetting('pomodoro_sessions_before_long_break', data.value)}
            style={{ width: 100 }}
          />
        </div>
      </Card>

      {/* Gamification */}
      <Card style={{ padding: 24, marginBottom: 16, background: tokens.colorNeutralBackground1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('settings.gamificationEnabled')}</span>
          <Switch
            checked={gamificationEnabled}
            onChange={(_, data) => updateSetting('gamification_enabled', data.checked ? 'true' : 'false')}
          />
        </div>
      </Card>

      {/* Data Management */}
      <Card style={{ padding: 24, marginBottom: 16, background: tokens.colorNeutralBackground1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.data')}</h3>

        {/* Export Section */}
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: tokens.colorNeutralForeground2 }}>{t('settings.exportData')}</h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <Card style={{ flex: '1 1 200px', padding: 16, background: tokens.colorNeutralBackground2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button appearance="secondary" icon={<ArrowDownloadRegular />} onClick={handleExportData} style={{ width: '100%' }}>
                {t('settings.exportData')} (.chronolog)
              </Button>
              <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>{t('settings.exportDataDesc')}</span>
            </div>
          </Card>
          <Card style={{ flex: '1 1 200px', padding: 16, background: tokens.colorNeutralBackground2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button appearance="secondary" icon={<ArrowDownloadRegular />} onClick={handleExportCSV} style={{ width: '100%' }}>
                {t('settings.exportCSV')}
              </Button>
              <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>{t('settings.csvExportDesc')}</span>
            </div>
          </Card>
        </div>
        {exportStatus && (
          <p style={{ fontSize: 13, margin: '0 0 16px 0', color: exportStatus.startsWith(t('common.error')) ? tokens.colorPaletteRedForeground1 : tokens.colorPaletteGreenForeground1 }}>
            {exportStatus}
          </p>
        )}

        {/* Import Section */}
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: tokens.colorNeutralForeground2 }}>{t('settings.importData')}</h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Card style={{ flex: '1 1 200px', padding: 16, background: tokens.colorNeutralBackground2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button appearance="secondary" icon={<DeleteRegular />} onClick={() => handleImportData('replace')} style={{ width: '100%' }}>
                {t('settings.importReplace')}
              </Button>
              <span style={{ fontSize: 12, color: tokens.colorPaletteRedForeground1 }}>{t('settings.importReplaceDesc')}</span>
            </div>
          </Card>
          <Card style={{ flex: '1 1 200px', padding: 16, background: tokens.colorNeutralBackground2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button appearance="secondary" icon={<ArrowSyncRegular />} onClick={() => handleImportData('merge')} style={{ width: '100%' }}>
                {t('settings.importMerge')}
              </Button>
              <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>{t('settings.importMergeDesc')}</span>
            </div>
          </Card>
        </div>
        {importStatus && (
          <p style={{ fontSize: 13, marginTop: 12, color: importStatus.startsWith(t('common.error')) ? tokens.colorPaletteRedForeground1 : tokens.colorPaletteGreenForeground1 }}>
            {importStatus}
          </p>
        )}
      </Card>

      {/* Shortcuts */}
      <Card style={{ padding: 24, marginBottom: 16, background: tokens.colorNeutralBackground1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          <KeyboardRegular style={{ marginRight: 8 }} />
          {t('settings.shortcuts')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('settings.shortcutToggleTimer')}</span>
            <code style={{ padding: '4px 8px', borderRadius: 4, background: tokens.colorNeutralBackground3, fontSize: 13 }}>
              Ctrl + Shift + T
            </code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('settings.shortcutShowHide')}</span>
            <code style={{ padding: '4px 8px', borderRadius: 4, background: tokens.colorNeutralBackground3, fontSize: 13 }}>
              Ctrl + Shift + L
            </code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('settings.shortcutCommandPalette')}</span>
            <code style={{ padding: '4px 8px', borderRadius: 4, background: tokens.colorNeutralBackground3, fontSize: 13 }}>
              Ctrl + K
            </code>
          </div>
        </div>
      </Card>

      {/* About & Updates */}
      <Card style={{ padding: 24, background: tokens.colorNeutralBackground1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoRegular style={{ fontSize: 20 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{t('settings.about')}</h3>
        </div>
        <div style={{ marginTop: 12, color: tokens.colorNeutralForeground3, fontSize: 13 }}>
          <p>{t('app.name')} — {t('app.tagline')}</p>
          <p style={{ marginTop: 4 }}>{t('settings.version')} {appVersion || '...'}</p>
        </div>

        {/* Update Section */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${tokens.colorNeutralStroke2}` }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: tokens.colorNeutralForeground1 }}>
            {t('settings.updates', { defaultValue: 'Updates' })}
          </h4>

          {updateStatus === 'idle' && (
            <Button
              appearance="secondary"
              icon={<ArrowSyncRegular />}
              onClick={() => window.electronAPI.updater.check()}
            >
              {t('settings.checkForUpdates', { defaultValue: 'Check for Updates' })}
            </Button>
          )}

          {updateStatus === 'checking' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: tokens.colorNeutralForeground2 }}>
              <ArrowSyncRegular style={{ animation: 'spin 1s linear infinite' }} />
              <span>{t('settings.checkingUpdates', { defaultValue: 'Checking for updates...' })}</span>
            </div>
          )}

          {updateStatus === 'up-to-date' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: tokens.colorPaletteGreenForeground1 }}>
                ✓ {t('settings.upToDate', { defaultValue: 'You are running the latest version.' })}
              </span>
              <Button
                appearance="subtle"
                size="small"
                onClick={() => {
                  setUpdateStatus('idle');
                  window.electronAPI.updater.check();
                }}
              >
                {t('settings.recheckUpdates', { defaultValue: 'Check again' })}
              </Button>
            </div>
          )}

          {updateStatus === 'available' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: tokens.colorBrandForeground1, fontWeight: 600 }}>
                {t('settings.updateAvailable', { defaultValue: 'Update available' })}: v{updateVersion}
              </span>
              <Button
                appearance="primary"
                icon={<ArrowDownloadRegular />}
                onClick={() => window.electronAPI.updater.download()}
              >
                {t('settings.downloadUpdate', { defaultValue: 'Download Update' })}
              </Button>
            </div>
          )}

          {updateStatus === 'downloading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span>{t('settings.downloading', { defaultValue: 'Downloading update...' })} {updatePercent}%</span>
              <div style={{ height: 6, borderRadius: 3, background: tokens.colorNeutralStroke2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${updatePercent}%`, background: tokens.colorBrandBackground, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {updateStatus === 'downloaded' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: tokens.colorPaletteGreenForeground1, fontWeight: 600 }}>
                ✓ {t('settings.updateReady', { defaultValue: 'Update downloaded and ready to install.' })}
              </span>
              <p style={{ fontSize: 12, color: tokens.colorNeutralForeground3, margin: 0 }}>
                {t('settings.updateRestartInfo', { defaultValue: 'The app will restart to apply the update. Your data will be preserved.' })}
              </p>
              <Button
                appearance="primary"
                onClick={() => window.electronAPI.updater.install()}
              >
                {t('settings.installAndRestart', { defaultValue: 'Install & Restart' })}
              </Button>
            </div>
          )}

          {updateStatus === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: tokens.colorPaletteRedForeground1 }}>
                {t('settings.updateError', { defaultValue: 'Could not check for updates. Please try again later.' })}
              </span>
              <Button
                appearance="secondary"
                size="small"
                onClick={() => {
                  setUpdateStatus('idle');
                  window.electronAPI.updater.check();
                }}
              >
                {t('settings.recheckUpdates', { defaultValue: 'Try again' })}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
