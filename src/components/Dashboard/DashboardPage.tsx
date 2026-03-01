import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  tokens,
  Badge,
  Button,
  ProgressBar,
  Tooltip,
  Divider,
} from '@fluentui/react-components';
import {
  PlayRegular,
  TimerRegular,
  ArrowRightRegular,
  EditRegular,
  TargetRegular,
  TrophyRegular,
} from '@fluentui/react-icons';
import ReactECharts from 'echarts-for-react';
import { useTimerStore } from '@/stores/timerStore';
import { useAppStore } from '@/stores/appStore';
import { useDataStore } from '@/stores/dataStore';
import * as dbService from '@/services/database';
import {
  formatDuration,
  formatMinutes,
  getToday,
  getStartOfWeek,
  getEndOfWeek,
  formatTime,
  formatDate,
  xpForLevel,
  xpProgress,
} from '@/utils/helpers';
import type { DayStats, TimeEntry, Gamification, PeriodStats } from '@/types';

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.goodMorning';
  if (hour < 18) return 'dashboard.goodAfternoon';
  return 'dashboard.goodEvening';
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { status, elapsedSeconds, currentEntry } = useTimerStore();
  const startTimer = useTimerStore((s) => s.startTimer);
  const { setPage, settings } = useAppStore();
  const { jobs } = useDataStore();

  const [todayStats, setTodayStats] = useState<DayStats | null>(null);
  const [weekStats, setWeekStats] = useState<PeriodStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DayStats[]>([]);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [goals, setGoals] = useState<any[]>([]);

  const dailyTargetMinutes = (parseFloat(settings.daily_target_hours || '8') || 8) * 60;
  const weeklyTargetMinutes = (parseFloat(settings.weekly_target_hours || '40') || 40) * 60;

  const loadData = useCallback(async () => {
    try {
      const today = getToday();
      const weekStart = getStartOfWeek();
      const weekEnd = getEndOfWeek();

      const [stats, wStats, entries, gam, goalList] = await Promise.all([
        dbService.getDayStats(today),
        dbService.getWeekStats(weekStart + 'T00:00:00', weekEnd + 'T23:59:59'),
        dbService.getTimeEntries({ limit: 5 }),
        dbService.getGamification(),
        dbService.getGoals(),
      ]);

      setTodayStats(stats);
      setWeekStats(wStats);
      setRecentEntries(entries);
      setGamification(gam);
      setGoals(goalList);

      // Load daily stats for each day of the week (Mon-Sun)
      const startDate = new Date(weekStart);
      const dayStatsPromises: Promise<DayStats>[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        dayStatsPromises.push(dbService.getDayStats(d.toISOString().split('T')[0]));
      }
      const allDayStats = await Promise.all(dayStatsPromises);
      setDailyStats(allDayStats);
    } catch (err) {
      console.error('Dashboard data load error:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const todayMinutes =
    (todayStats?.work_minutes || 0) + (status === 'running' ? elapsedSeconds / 60 : 0);
  const todayPercent = Math.min(1, todayMinutes / dailyTargetMinutes);
  const weekTotalMinutes =
    (weekStats?.total_minutes || 0) + (status === 'running' ? elapsedSeconds / 60 : 0);
  const weekPercent = Math.min(1, weekTotalMinutes / weeklyTargetMinutes);

  // XP
  const currentXP = gamification?.xp || 0;
  const currentLevel = gamification?.level || 1;
  const xpInLevel = xpProgress(currentXP, currentLevel);
  const xpNeeded = xpForLevel(currentLevel);
  const xpPercent = Math.min(1, xpInLevel / xpNeeded);

  // Day labels for bar chart
  const dayLabels = useMemo(() => {
    const labels: string[] = [];
    const startDate = new Date(getStartOfWeek());
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      labels.push(
        d.toLocaleDateString(undefined, { weekday: 'short' })
      );
    }
    return labels;
  }, []);

  // Weekly bar chart option
  const weeklyChartOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          const p = params[0];
          return `${p.name}: ${formatMinutes(p.value)}`;
        },
      },
      grid: { top: 16, right: 12, bottom: 24, left: 48 },
      xAxis: {
        type: 'category' as const,
        data: dayLabels,
        axisLine: { lineStyle: { color: tokens.colorNeutralStroke2 } },
        axisLabel: { color: tokens.colorNeutralForeground3 },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: {
          color: tokens.colorNeutralForeground3,
          formatter: (v: number) => formatMinutes(v),
        },
        splitLine: { lineStyle: { color: tokens.colorNeutralStroke2, type: 'dashed' as const } },
      },
      series: [
        {
          type: 'bar',
          data: dailyStats.map((ds) => ds.work_minutes),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: tokens.colorBrandBackground,
          },
          barMaxWidth: 36,
          emphasis: {
            itemStyle: { color: tokens.colorBrandBackgroundPressed },
          },
        },
      ],
    }),
    [dailyStats, dayLabels]
  );

  // Job distribution pie chart option
  const jobPieOption = useMemo(() => {
    const byJob = weekStats?.by_job || [];
    if (byJob.length === 0) return null;
    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: any) => `${p.name}: ${formatMinutes(p.value)} (${p.percent}%)`,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '75%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: tokens.colorNeutralBackground1, borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontWeight: 'bold' },
          },
          data: byJob.map((j) => ({
            name: j.job_name,
            value: Math.round(j.minutes),
            itemStyle: { color: j.color },
          })),
        },
      ],
    };
  }, [weekStats]);

  // Styles
  const gridContainerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 24,
  };

  const progressBarTrack: React.CSSProperties = {
    height: 6,
    borderRadius: 3,
    background: tokens.colorNeutralStroke2,
    overflow: 'hidden',
  };

  const cardBase: React.CSSProperties = {
    background: tokens.colorNeutralBackground1,
  };

  return (
    <div className="fade-in">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t(getGreetingKey())} 👋</h1>
          <p style={{ fontSize: 14, color: tokens.colorNeutralForeground3, margin: '4px 0 0' }}>
            {formatDate(getToday())}
          </p>
        </div>
        {status !== 'idle' && (
          <Button
            appearance="subtle"
            icon={<TimerRegular />}
            onClick={() => setPage('timer')}
          >
            {formatDuration(elapsedSeconds)}
          </Button>
        )}
      </div>

      <div style={gridContainerStyle}>
        {/* ========== LEFT COLUMN ========== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Stats Grid */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {/* Today's Work */}
            <Card className="stat-card" style={cardBase}>
              <div className="stat-card-label">{t('dashboard.todayOverview')}</div>
              <div className="stat-card-value" style={{ color: tokens.colorBrandForeground1 }}>
                {formatMinutes(todayMinutes)}
              </div>
              <div style={progressBarTrack}>
                <div
                  style={{
                    height: '100%',
                    width: `${todayPercent * 100}%`,
                    background: todayPercent >= 1 ? '#10b981' : tokens.colorBrandBackground,
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                {t('dashboard.dailyGoal')}: {formatMinutes(dailyTargetMinutes)}
              </div>
            </Card>

            {/* Weekly Work */}
            <Card className="stat-card" style={cardBase}>
              <div className="stat-card-label">{t('dashboard.weekOverview')}</div>
              <div className="stat-card-value" style={{ color: tokens.colorBrandForeground1 }}>
                {formatMinutes(weekTotalMinutes)}
              </div>
              <div style={progressBarTrack}>
                <div
                  style={{
                    height: '100%',
                    width: `${weekPercent * 100}%`,
                    background: weekPercent >= 1 ? '#10b981' : tokens.colorBrandBackground,
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                {t('dashboard.weeklyGoal')}: {formatMinutes(weeklyTargetMinutes)}
              </div>
            </Card>

            {/* Breaks Today */}
            <Card className="stat-card" style={cardBase}>
              <div className="stat-card-label">{t('dashboard.breaks')}</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>
                    {todayStats?.coffee_breaks || 0}
                  </span>
                  <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginLeft: 4 }}>
                    ☕
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>
                    {todayStats?.lunch_breaks || 0}
                  </span>
                  <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginLeft: 4 }}>
                    🍽️
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                {formatMinutes(todayStats?.break_minutes || 0)} {t('dashboard.breaks').toLowerCase()}
              </div>
            </Card>

            {/* Streak + XP Level */}
            <Card className="stat-card" style={cardBase}>
              <div className="stat-card-label">
                {t('dashboard.currentStreak')} &amp; {t('dashboard.level')}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span style={{ fontSize: 24, fontWeight: 600, color: '#f59e0b' }}>
                  🔥 {gamification?.current_streak || 0}
                </span>
                <Badge appearance="filled" color="brand" size="medium">
                  {t('gamification.level')} {currentLevel}
                </Badge>
              </div>
              <Tooltip
                content={`${xpInLevel} / ${xpNeeded} ${t('gamification.xp')}`}
                relationship="label"
              >
                <div style={progressBarTrack}>
                  <div
                    style={{
                      height: '100%',
                      width: `${xpPercent * 100}%`,
                      background: '#8b5cf6',
                      borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </Tooltip>
              <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                {xpInLevel}/{xpNeeded} {t('gamification.xp')} · {t('goals.longestStreak')}: {gamification?.longest_streak || 0}
              </div>
            </Card>
          </div>

          {/* Quick-Start Timer */}
          <Card style={{ ...cardBase, padding: 20 }}>
            {status === 'idle' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  padding: '12px 0',
                }}
              >
                <Button
                  appearance="primary"
                  size="large"
                  icon={<PlayRegular />}
                  onClick={() => {
                    if (jobs.length > 0) {
                      startTimer();
                    } else {
                      setPage('timer');
                    }
                  }}
                  style={{ minWidth: 200, height: 48, fontSize: 16, borderRadius: 12 }}
                >
                  {t('dashboard.startTimer')}
                </Button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '4px 0',
                }}
              >
                <div
                  className="timer-display-small pulse"
                  style={{ color: tokens.colorBrandForeground1, cursor: 'pointer' }}
                  onClick={() => setPage('timer')}
                >
                  {formatDuration(elapsedSeconds)}
                </div>
                <Divider vertical style={{ height: 32 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: tokens.colorNeutralForeground1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentEntry?.project_name || currentEntry?.job_name || t('timer.running')}
                  </div>
                  {currentEntry?.job_name && currentEntry?.project_name && (
                    <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                      {currentEntry.job_name}
                    </div>
                  )}
                </div>
                <Badge appearance="filled" color="success" size="small" className="pulse">
                  {t('timer.running')}
                </Badge>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<ArrowRightRegular />}
                  onClick={() => setPage('timer')}
                />
              </div>
            )}
          </Card>

          {/* Weekly Hours Bar Chart */}
          <Card style={{ ...cardBase, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              {t('dashboard.weeklyChart')}
            </h3>
            {dailyStats.length > 0 ? (
              <ReactECharts
                option={weeklyChartOption}
                style={{ height: 220 }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div
                style={{
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tokens.colorNeutralForeground3,
                }}
              >
                {t('common.loading')}
              </div>
            )}
          </Card>

          {/* Recent Entries */}
          <Card style={{ ...cardBase, padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{t('dashboard.recentEntries')}</h3>
              <Button
                appearance="subtle"
                size="small"
                icon={<ArrowRightRegular />}
                iconPosition="after"
                onClick={() => setPage('entries')}
              >
                {t('entries.title')}
              </Button>
            </div>

            <div className="entries-list">
              {recentEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: tokens.colorNeutralForeground3 }}>
                  {t('entries.noEntries')}
                </div>
              ) : (
                recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="entry-item"
                    style={{ background: tokens.colorNeutralBackground2 }}
                  >
                    <div
                      className="entry-color-bar"
                      style={{ background: entry.job_color || tokens.colorBrandBackground }}
                    />
                    <div className="entry-info">
                      <div
                        className="entry-title"
                        style={{ color: tokens.colorNeutralForeground1 }}
                      >
                        {entry.project_name || entry.job_name || '—'}
                      </div>
                      <div className="entry-meta">
                        {entry.category_name && <span>{entry.category_name} · </span>}
                        {formatTime(entry.start_time)}
                        {entry.end_time && ` – ${formatTime(entry.end_time)}`}
                        {entry.is_running && (
                          <Badge
                            appearance="filled"
                            color="success"
                            size="small"
                            style={{ marginLeft: 8 }}
                          >
                            {t('timer.running')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div
                      className="entry-duration"
                      style={{ color: tokens.colorNeutralForeground1 }}
                    >
                      {entry.duration_minutes
                        ? formatMinutes(entry.duration_minutes)
                        : entry.is_running
                          ? formatDuration(elapsedSeconds)
                          : '—'}
                    </div>
                    <Tooltip content={t('dashboard.editEntry')} relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<EditRegular />}
                        onClick={() => setPage('entries')}
                      />
                    </Tooltip>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ========== RIGHT SIDEBAR ========== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Job Distribution Pie Chart */}
          <Card style={{ ...cardBase, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {t('dashboard.jobDistribution')}
            </h3>
            {jobPieOption ? (
              <>
                <ReactECharts
                  option={jobPieOption}
                  style={{ height: 200 }}
                  notMerge
                  lazyUpdate
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {(weekStats?.by_job || []).map((j) => (
                    <div
                      key={j.job_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <span
                        className="color-dot"
                        style={{ background: j.color, width: 8, height: 8 }}
                      />
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: tokens.colorNeutralForeground1,
                        }}
                      >
                        {j.job_name}
                      </span>
                      <span
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          color: tokens.colorNeutralForeground3,
                          fontWeight: 500,
                        }}
                      >
                        {formatMinutes(j.minutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div
                style={{
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tokens.colorNeutralForeground3,
                  fontSize: 13,
                }}
              >
                {t('common.noData')}
              </div>
            )}
          </Card>

          {/* Goal Progress */}
          <Card style={{ ...cardBase, padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TargetRegular />
                {t('dashboard.goalProgress')}
              </h3>
              <Button
                appearance="subtle"
                size="small"
                icon={<ArrowRightRegular />}
                onClick={() => setPage('goals')}
              />
            </div>
            {goals.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 0',
                  color: tokens.colorNeutralForeground3,
                  fontSize: 13,
                }}
              >
                {t('dashboard.noGoals')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {goals.slice(0, 4).map((goal) => {
                  const progress = Math.min(1, (goal.current_hours || 0) / goal.target_hours);
                  const isAchieved = progress >= 1;
                  return (
                    <div key={goal.id}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: tokens.colorNeutralForeground1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {goal.name}
                        </span>
                        {isAchieved ? (
                          <Badge appearance="filled" color="success" size="small">
                            {t('goals.achieved')}
                          </Badge>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              color: tokens.colorNeutralForeground3,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {(goal.current_hours || 0).toFixed(1)}/{goal.target_hours}h
                          </span>
                        )}
                      </div>
                      <div style={progressBarTrack}>
                        <div
                          style={{
                            height: '100%',
                            width: `${progress * 100}%`,
                            background: isAchieved ? '#10b981' : tokens.colorBrandBackground,
                            borderRadius: 3,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: tokens.colorNeutralForeground3, marginTop: 2 }}>
                        {t(`goals.${goal.goal_type}`)}
                        {goal.job_name && ` · ${goal.job_name}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* XP Card */}
          <Card style={{ ...cardBase, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TrophyRegular style={{ fontSize: 20, color: '#f59e0b' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                {t('gamification.level')} {currentLevel}
              </h3>
            </div>
            <ProgressBar
              value={xpPercent}
              thickness="large"
              color="brand"
              style={{ marginBottom: 8 }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: tokens.colorNeutralForeground3,
              }}
            >
              <span>
                {xpInLevel} / {xpNeeded} {t('gamification.xp')}
              </span>
              <span>{t('gamification.nextLevel')}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
