import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CardHeader,
  Dropdown,
  Option,
  Textarea,
  tokens,
  Badge,
  Tooltip,
  Switch,
  makeStyles,
  shorthands,
  mergeClasses,
  Text,
  Divider,
} from '@fluentui/react-components';
import {
  PlayFilled,
  StopFilled,
  PlayCircleRegular,
  DrinkCoffeeRegular,
  FoodRegular,
  TimerRegular,
  TagRegular,
  NoteRegular,
  ClockRegular,
  CheckmarkCircleFilled,
} from '@fluentui/react-icons';
import { useTimerStore } from '@/stores/timerStore';
import { useDataStore } from '@/stores/dataStore';
import { useAppStore } from '@/stores/appStore';
import { getDayStats, getTimeEntries } from '@/services/database';
import { formatDuration, formatMinutes, getToday } from '@/utils/helpers';
import type { DayStats, TimeEntry } from '@/types';

// --------------- Styles ---------------

const useStyles = makeStyles({
  root: {
    maxWidth: '720px',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('20px'),
    paddingBottom: '32px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: tokens.colorNeutralForeground1,
    ...shorthands.margin('0'),
  },
  timerCard: {
    ...shorthands.padding('40px', '24px'),
    textAlign: 'center',
    position: 'relative' as const,
    ...shorthands.overflow('hidden'),
  },
  timerWrapper: {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  timerDisplay: {
    fontSize: '56px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-1px',
    color: tokens.colorNeutralForeground1,
    lineHeight: '1',
    userSelect: 'none',
  },
  pulsingDot: {
    width: '12px',
    height: '12px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: tokens.colorPaletteGreenBackground3,
    display: 'inline-block',
    marginLeft: '12px',
    animationName: {
      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
      '50%': { opacity: 0.4, transform: 'scale(0.8)' },
    },
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  pomodoroRing: {
    position: 'absolute' as const,
    top: '-20px',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  breakBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('8px', '16px'),
    ...shorthands.borderRadius('20px'),
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteYellowForeground2,
    fontWeight: 600,
    fontSize: '14px',
    marginBottom: '16px',
  },
  entryInfo: {
    display: 'flex',
    justifyContent: 'center',
    ...shorthands.gap('10px'),
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    ...shorthands.gap('12px'),
    flexWrap: 'wrap',
  },
  breakButtons: {
    display: 'flex',
    ...shorthands.gap('8px'),
  },
  stopBtn: {
    minWidth: '140px',
    height: '48px',
    fontSize: '16px',
    backgroundColor: '#e74856',
    ...shorthands.borderColor('#e74856'),
    ':hover': {
      backgroundColor: '#c42b3a',
      ...shorthands.borderColor('#c42b3a'),
    },
  },
  startBtn: {
    minWidth: '180px',
    height: '48px',
    fontSize: '16px',
  },
  resumeBtn: {
    minWidth: '140px',
    height: '48px',
    fontSize: '16px',
  },
  breakBtn: {
    height: '48px',
  },
  selectionCard: {
    ...shorthands.padding('24px'),
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('16px'),
    '@media (max-width: 560px)': {
      gridTemplateColumns: '1fr',
    },
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  formFieldFull: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
    gridColumn: 'span 2',
    '@media (max-width: 560px)': {
      gridColumn: 'span 1',
    },
  },
  label: {
    fontWeight: 600,
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('6px'),
  },
  tagChip: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    ...shorthands.padding('4px', '12px'),
    ...shorthands.borderRadius('16px'),
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    ...shorthands.borderWidth('1.5px'),
    ...shorthands.borderStyle('solid'),
    transitionProperty: 'all',
    transitionDuration: '0.15s',
    userSelect: 'none',
  },
  tagChipSelected: {
    color: '#fff',
  },
  tagChipUnselected: {
    backgroundColor: 'transparent',
  },
  summaryCard: {
    ...shorthands.padding('20px', '24px'),
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    ...shorthands.gap('16px'),
    textAlign: 'center',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  summaryValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: tokens.colorNeutralForeground1,
  },
  summaryLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  recentCard: {
    ...shorthands.padding('20px', '24px'),
  },
  recentEntry: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    ...shorthands.padding('10px', '0'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ':last-child': {
      ...shorthands.borderBottom('none'),
    },
  },
  colorBar: {
    width: '4px',
    height: '36px',
    ...shorthands.borderRadius('2px'),
    flexShrink: 0,
  },
  recentEntryInfo: {
    flexGrow: 1,
    minWidth: 0,
  },
  recentEntryName: {
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
  },
  recentEntryMeta: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  recentEntryDuration: {
    fontSize: '14px',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
  },
  pomodoroToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('8px'),
    marginTop: '12px',
  },
  pomodoroSuggest: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('10px', '16px'),
    ...shorthands.borderRadius('8px'),
    backgroundColor: tokens.colorPaletteGreenBackground1,
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: 600,
    fontSize: '14px',
    marginTop: '12px',
  },
  breakHint: {
    marginTop: '12px',
    fontSize: '12px',
    opacity: 0.6,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    marginBottom: '12px',
  },
  colorDot: {
    width: '10px',
    height: '10px',
    ...shorthands.borderRadius('50%'),
    display: 'inline-block',
    flexShrink: 0,
  },
});

// --------------- Pomodoro ring SVG ---------------

function PomodoroRing({
  progress,
  size = 220,
  strokeWidth = 6,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(progress, 1));

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={tokens.colorNeutralStroke2}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={tokens.colorBrandBackground}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

// --------------- Component ---------------

export function TimerPage() {
  const { t } = useTranslation();
  const styles = useStyles();

  // Stores
  const {
    status,
    elapsedSeconds,
    breakElapsedSeconds,
    currentEntry,
    currentBreak,
    selectedJobId,
    selectedProjectId,
    selectedCategoryId,
    note,
    setSelectedJob,
    setSelectedProject,
    setSelectedCategory,
    setNote,
    startTimer,
    stopTimer,
    startBreak,
    endBreak,
  } = useTimerStore();

  const { jobs, projects, categories, tags } = useDataStore();
  const { settings } = useAppStore();

  // Local state
  const [dayStats, setDayStats] = useState<DayStats | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [pomodoroSuggestBreak, setPomodoroSuggestBreak] = useState(false);

  const isIdle = status === 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  // Derived data
  const activeJobs = useMemo(() => jobs.filter((j) => !j.is_archived), [jobs]);
  const jobProjects = useMemo(
    () => projects.filter((p) => !p.is_archived && p.job_id === selectedJobId),
    [projects, selectedJobId],
  );
  const activeCategories = useMemo(() => categories.filter((c) => !c.is_archived), [categories]);

  // Pomodoro settings
  const pomodoroWorkMinutes = Number(settings.pomodoro_work_minutes) || 25;
  const pomodoroBreakMinutes = Number(settings.pomodoro_break_minutes) || 5;
  const pomodoroWorkSeconds = pomodoroWorkMinutes * 60;

  // Pomodoro progress
  const pomodoroProgress = pomodoroEnabled && isRunning ? elapsedSeconds / pomodoroWorkSeconds : 0;

  // Auto-suggest break when pomodoro ends
  useEffect(() => {
    if (pomodoroEnabled && isRunning && elapsedSeconds >= pomodoroWorkSeconds) {
      setPomodoroSuggestBreak(true);
    } else {
      setPomodoroSuggestBreak(false);
    }
  }, [pomodoroEnabled, isRunning, elapsedSeconds, pomodoroWorkSeconds]);

  // Load today's stats
  const loadTodayData = useCallback(async () => {
    const today = getToday();
    const [stats, entries] = await Promise.all([
      getDayStats(today),
      getTimeEntries({ startDate: `${today}T00:00:00`, endDate: `${today}T23:59:59`, limit: 3 }),
    ]);
    setDayStats(stats);
    setRecentEntries(entries);
  }, []);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  // Refresh stats when timer stops
  useEffect(() => {
    if (isIdle) {
      loadTodayData();
    }
  }, [isIdle, loadTodayData]);

  // Tag toggling
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  // Format time from ISO
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t('nav.timer')}</h1>
        {!isIdle && (
          <Badge
            appearance="filled"
            color={isRunning ? 'success' : 'warning'}
            size="large"
          >
            {isRunning ? t('timer.running') : t('timer.paused')}
          </Badge>
        )}
      </div>

      {/* Timer Card */}
      <Card className={styles.timerCard}>
        {/* Timer Display */}
        <div className={styles.timerWrapper}>
          {pomodoroEnabled && (isRunning || isPaused) && (
            <div className={styles.pomodoroRing}>
              <PomodoroRing progress={pomodoroProgress} size={220} strokeWidth={6} />
            </div>
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className={styles.timerDisplay}>
              {formatDuration(elapsedSeconds)}
              {isRunning && <span className={styles.pulsingDot} />}
            </div>
          </div>
        </div>

        {/* Break badge */}
        {isPaused && currentBreak && (
          <div>
            <div className={styles.breakBadge}>
              <span>{currentBreak.break_type === 'coffee' ? '☕' : '🍽️'}</span>
              <span>
                {currentBreak.break_type === 'coffee'
                  ? t('timer.coffeeBreak')
                  : t('timer.lunchBreak')}
              </span>
              <span>—</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(breakElapsedSeconds)}
              </span>
            </div>
          </div>
        )}

        {/* Job/Project info when running */}
        {currentEntry && (
          <div className={styles.entryInfo}>
            {currentEntry.job_name && (
              <Badge appearance="outline" color="informative" size="large">
                <span
                  className={styles.colorDot}
                  style={{ backgroundColor: currentEntry.job_color, marginRight: 6 }}
                />
                {currentEntry.job_name}
              </Badge>
            )}
            {currentEntry.project_name && (
              <Badge appearance="outline" color="informative" size="large">
                <span
                  className={styles.colorDot}
                  style={{ backgroundColor: currentEntry.project_color, marginRight: 6 }}
                />
                {currentEntry.project_name}
              </Badge>
            )}
            {currentEntry.category_name && (
              <Badge appearance="outline" size="large">
                {currentEntry.category_name}
              </Badge>
            )}
          </div>
        )}

        {/* Pomodoro suggest break */}
        {pomodoroSuggestBreak && isRunning && (
          <div className={styles.pomodoroSuggest}>
            <CheckmarkCircleFilled />
            <span>{t('pomodoro.completed')}!</span>
            <Button
              size="small"
              appearance="primary"
              icon={<DrinkCoffeeRegular />}
              onClick={() => {
                startBreak('coffee');
                setPomodoroSuggestBreak(false);
              }}
            >
              {t('pomodoro.shortBreak')} ({pomodoroBreakMinutes}{t('common.minutes')})
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className={styles.controls}>
          {isIdle ? (
            <Tooltip content={t('timer.start')} relationship="label">
              <Button
                appearance="primary"
                size="large"
                icon={<PlayFilled />}
                onClick={startTimer}
                disabled={!selectedJobId}
                className={styles.startBtn}
              >
                {t('timer.start')}
              </Button>
            </Tooltip>
          ) : (
            <>
              {/* Stop */}
              <Tooltip content={t('timer.stop')} relationship="label">
                <Button
                  appearance="primary"
                  size="large"
                  icon={<StopFilled />}
                  onClick={stopTimer}
                  className={styles.stopBtn}
                >
                  {t('timer.stop')}
                </Button>
              </Tooltip>

              {/* Pause / Resume */}
              {isPaused ? (
                <Tooltip content={t('timer.resume')} relationship="label">
                  <Button
                    appearance="secondary"
                    size="large"
                    icon={<PlayCircleRegular />}
                    onClick={endBreak}
                    className={styles.resumeBtn}
                  >
                    {t('timer.resume')}
                  </Button>
                </Tooltip>
              ) : (
                <div className={styles.breakButtons}>
                  <Tooltip content={t('tooltip.coffeeBreak')} relationship="description">
                    <Button
                      appearance="secondary"
                      size="large"
                      icon={<DrinkCoffeeRegular />}
                      onClick={() => startBreak('coffee')}
                      className={styles.breakBtn}
                    >
                      ☕
                    </Button>
                  </Tooltip>
                  <Tooltip content={t('tooltip.lunchBreak')} relationship="description">
                    <Button
                      appearance="secondary"
                      size="large"
                      icon={<FoodRegular />}
                      onClick={() => startBreak('lunch')}
                      className={styles.breakBtn}
                    >
                      🍽️
                    </Button>
                  </Tooltip>
                </div>
              )}
            </>
          )}
        </div>

        {/* Break info hint */}
        {isRunning && (
          <div className={styles.breakHint}>{t('timer.breakInfo')}</div>
        )}

        {/* Pomodoro toggle */}
        <Tooltip content={t('tooltip.pomodoroMode')} relationship="description">
        <div className={styles.pomodoroToggle}>
          <TimerRegular />
          <Text size={200}>{t('pomodoro.title')}</Text>
          <Switch
            checked={pomodoroEnabled}
            onChange={(_, data) => setPomodoroEnabled(data.checked)}
          />
          {pomodoroEnabled && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {pomodoroWorkMinutes}{t('common.minutes')} / {pomodoroBreakMinutes}{t('common.minutes')}
            </Text>
          )}
        </div>
        </Tooltip>
      </Card>

      {/* Selection Fields (only when idle) */}
      {isIdle && (
        <Card className={styles.selectionCard}>
          <div className={styles.formGrid}>
            {/* Job */}
            <div className={styles.formField}>
              <label className={styles.label}>
                {t('entries.job')} *
              </label>
              <Dropdown
                placeholder={t('timer.selectJob')}
                value={activeJobs.find((j) => j.id === selectedJobId)?.name || ''}
                selectedOptions={selectedJobId ? [selectedJobId] : []}
                onOptionSelect={(_, data) => setSelectedJob(data.optionValue as string)}
              >
                {activeJobs.map((job) => (
                  <Option key={job.id} value={job.id} text={job.name}>
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: job.color, marginRight: 8 }}
                    />
                    {job.name}
                  </Option>
                ))}
              </Dropdown>
            </div>

            {/* Project */}
            <div className={styles.formField}>
              <label className={styles.label}>
                {t('entries.project')}
              </label>
              <Dropdown
                placeholder={t('timer.selectProject')}
                value={jobProjects.find((p) => p.id === selectedProjectId)?.name || ''}
                selectedOptions={selectedProjectId ? [selectedProjectId] : []}
                onOptionSelect={(_, data) => setSelectedProject(data.optionValue as string)}
                disabled={!selectedJobId || jobProjects.length === 0}
              >
                {jobProjects.map((project) => (
                  <Option key={project.id} value={project.id} text={project.name}>
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: project.color, marginRight: 8 }}
                    />
                    {project.name}
                  </Option>
                ))}
              </Dropdown>
            </div>

            {/* Category */}
            <div className={styles.formField}>
              <label className={styles.label}>
                {t('entries.category')}
              </label>
              <Dropdown
                placeholder={t('timer.selectCategory')}
                value={activeCategories.find((c) => c.id === selectedCategoryId)?.name || ''}
                selectedOptions={selectedCategoryId ? [selectedCategoryId] : []}
                onOptionSelect={(_, data) => setSelectedCategory(data.optionValue as string)}
              >
                {activeCategories.map((cat) => (
                  <Option key={cat.id} value={cat.id} text={cat.name}>
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: cat.color, marginRight: 8 }}
                    />
                    {cat.name}
                  </Option>
                ))}
              </Dropdown>
            </div>

            {/* Spacer cell for grid alignment */}
            <div />

            {/* Tags */}
            {tags.length > 0 && (
              <div className={styles.formFieldFull}>
                <label className={styles.label}>
                  <TagRegular style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {t('entries.tags')}
                </label>
                <div className={styles.tagsContainer}>
                  {tags.map((tag) => {
                    const selected = selectedTagIds.has(tag.id);
                    return (
                      <span
                        key={tag.id}
                        role="button"
                        tabIndex={0}
                        className={mergeClasses(
                          styles.tagChip,
                          selected ? styles.tagChipSelected : styles.tagChipUnselected,
                        )}
                        style={{
                          borderColor: tag.color,
                          backgroundColor: selected ? tag.color : 'transparent',
                          color: selected ? '#fff' : tag.color,
                        }}
                        onClick={() => toggleTag(tag.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleTag(tag.id);
                          }
                        }}
                      >
                        {selected && <CheckmarkCircleFilled style={{ fontSize: 14 }} />}
                        {tag.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Note */}
            <div className={styles.formFieldFull}>
              <label className={styles.label}>
                <NoteRegular style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {t('entries.note')}
              </label>
              <Textarea
                placeholder={t('timer.addNote')}
                value={note}
                onChange={(_, data) => setNote(data.value)}
                resize="vertical"
                style={{ minHeight: 60 }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Today's Summary */}
      {dayStats && (
        <Card className={styles.summaryCard}>
          <div className={styles.sectionTitle}>
            <ClockRegular />
            {t('timer.today')}
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>
                {formatMinutes(dayStats.work_minutes)}
              </span>
              <span className={styles.summaryLabel}>
                {t('dashboard.totalHours')}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>
                {dayStats.entries_count}
              </span>
              <span className={styles.summaryLabel}>
                {t('dashboard.recentEntries')}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>
                {formatMinutes(dayStats.break_minutes)}
              </span>
              <span className={styles.summaryLabel}>
                {t('dashboard.breaks')}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <Card className={styles.recentCard}>
          <div className={styles.sectionTitle}>
            <TimerRegular />
            {t('dashboard.recentEntries')}
          </div>
          {recentEntries.map((entry) => (
            <div key={entry.id} className={styles.recentEntry}>
              <div
                className={styles.colorBar}
                style={{ backgroundColor: entry.job_color || tokens.colorNeutralStroke1 }}
              />
              <div className={styles.recentEntryInfo}>
                <div className={styles.recentEntryName}>
                  {entry.job_name}
                  {entry.project_name ? ` · ${entry.project_name}` : ''}
                </div>
                <div className={styles.recentEntryMeta}>
                  {formatTime(entry.start_time)}
                  {entry.end_time ? ` – ${formatTime(entry.end_time)}` : ''}
                  {entry.category_name ? ` · ${entry.category_name}` : ''}
                </div>
              </div>
              <div className={styles.recentEntryDuration}>
                {entry.duration_minutes != null
                  ? formatMinutes(entry.duration_minutes)
                  : '—'}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
