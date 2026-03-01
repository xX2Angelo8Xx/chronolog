import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Switch,
  Input,
  Dropdown,
  Option,
  tokens,
  Button,
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
} from '@fluentui/react-icons';
import { useAppStore } from '@/stores/appStore';
import type { ThemeMode } from '@/types';

export function SettingsPage() {
  const { t } = useTranslation();
  const { theme, language, settings, setTheme, setLanguage, updateSetting, toggleCommandPalette } = useAppStore();

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
    if (result.success) {
      const total = result.imported ? Object.values(result.imported).reduce((a: number, b: number) => a + b, 0) : 0;
      setImportStatus(t('settings.importSuccess', { count: total }));
      // Reload all data
      window.location.reload();
    } else {
      setImportStatus(t('common.error') + ': ' + (result.error || result.errors?.join(', ')));
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
      </div>

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
            contentAfter={<span style={{ fontSize: 12, opacity: 0.6 }}>min</span>}
          />
        </div>
        <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
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
            contentAfter={<span style={{ fontSize: 12, opacity: 0.6 }}>h</span>}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('settings.weeklyTarget')}</span>
          <Input
            type="number"
            value={weeklyTarget}
            onChange={(_, data) => updateSetting('weekly_target_hours', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, opacity: 0.6 }}>h</span>}
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
            contentAfter={<span style={{ fontSize: 12, opacity: 0.6 }}>min</span>}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>{t('settings.pomodoroBreak')}</span>
          <Input
            type="number"
            value={pomodoroBreak}
            onChange={(_, data) => updateSetting('pomodoro_break_minutes', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, opacity: 0.6 }}>min</span>}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>{t('pomodoro.longBreak')}</span>
          <Input
            type="number"
            value={pomodoroLongBreak}
            onChange={(_, data) => updateSetting('pomodoro_long_break_minutes', data.value)}
            style={{ width: 100 }}
            contentAfter={<span style={{ fontSize: 12, opacity: 0.6 }}>min</span>}
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
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>{t('settings.exportData')}</h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <Card style={{ flex: '1 1 200px', padding: 16, background: tokens.colorNeutralBackground2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button appearance="secondary" icon={<ArrowDownloadRegular />} onClick={handleExportData} style={{ width: '100%' }}>
                {t('settings.exportData')} (.chronolog)
              </Button>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{t('settings.exportDataDesc')}</span>
            </div>
          </Card>
          <Card style={{ flex: '1 1 200px', padding: 16, background: tokens.colorNeutralBackground2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button appearance="secondary" icon={<ArrowDownloadRegular />} onClick={handleExportCSV} style={{ width: '100%' }}>
                {t('settings.exportCSV')}
              </Button>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{t('settings.csvExportDesc')}</span>
            </div>
          </Card>
        </div>
        {exportStatus && (
          <p style={{ fontSize: 13, margin: '0 0 16px 0', color: exportStatus.startsWith(t('common.error')) ? tokens.colorPaletteRedForeground1 : tokens.colorPaletteGreenForeground1 }}>
            {exportStatus}
          </p>
        )}

        {/* Import Section */}
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>{t('settings.importData')}</h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Card style={{ flex: '1 1 200px', padding: 16, background: tokens.colorNeutralBackground2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button appearance="secondary" icon={<DeleteRegular />} onClick={() => handleImportData('replace')} style={{ width: '100%' }}>
                {t('settings.importReplace')}
              </Button>
              <span style={{ fontSize: 12, opacity: 0.6, color: tokens.colorPaletteRedForeground1 }}>{t('settings.importReplaceDesc')}</span>
            </div>
          </Card>
          <Card style={{ flex: '1 1 200px', padding: 16, background: tokens.colorNeutralBackground2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button appearance="secondary" icon={<ArrowSyncRegular />} onClick={() => handleImportData('merge')} style={{ width: '100%' }}>
                {t('settings.importMerge')}
              </Button>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{t('settings.importMergeDesc')}</span>
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
            <span>Command Palette</span>
            <code style={{ padding: '4px 8px', borderRadius: 4, background: tokens.colorNeutralBackground3, fontSize: 13 }}>
              Ctrl + K
            </code>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card style={{ padding: 24, background: tokens.colorNeutralBackground1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoRegular style={{ fontSize: 20 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{t('settings.about')}</h3>
        </div>
        <div style={{ marginTop: 12, opacity: 0.6, fontSize: 13 }}>
          <p>{t('app.name')} — {t('app.tagline')}</p>
          <p style={{ marginTop: 4 }}>{t('settings.version')} 1.0.0</p>
        </div>
      </Card>
    </div>
  );
}
