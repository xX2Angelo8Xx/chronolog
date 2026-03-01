import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Input,
  Option,
  ProgressBar,
  Tooltip,
  tokens,
} from '@fluentui/react-components';
import {
  AddRegular,
  CheckmarkCircleFilled,
  DeleteRegular,
  DismissCircleFilled,
  StarFilled,
  TrophyRegular,
} from '@fluentui/react-icons';
import { useDataStore } from '@/stores/dataStore';
import * as dbService from '@/services/database';
import {
  formatMinutes,
  getEndOfMonth,
  getEndOfWeek,
  getStartOfMonth,
  getStartOfWeek,
  getToday,
  xpForLevel,
  xpProgress,
} from '@/utils/helpers';
import type { Achievement, Gamification, Goal } from '@/types';

interface GoalWithProgress extends Goal {
  current_hours: number;
  progress_percent: number;
}

interface DayScore {
  label: string;
  logged: boolean;
}

export function GoalsPage() {
  const { t } = useTranslation();
  const { jobs } = useDataStore();

  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [weekDays, setWeekDays] = useState<DayScore[]>([]);
  const [weekTotalMinutes, setWeekTotalMinutes] = useState(0);
  const [weekTargetMinutes, setWeekTargetMinutes] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<string>('weekly');
  const [formHours, setFormHours] = useState('40');
  const [formJobId, setFormJobId] = useState('');

  const activeJobs = useMemo(() => jobs.filter((j) => !j.is_archived), [jobs]);

  // ---------- helpers ----------

  const getDateRangeForGoal = useCallback(
    (goalType: string): { start: string; end: string } => {
      const now = new Date();
      switch (goalType) {
        case 'daily':
          return { start: getToday(), end: getToday() };
        case 'weekly':
          return { start: getStartOfWeek(now), end: getEndOfWeek(now) };
        case 'monthly':
          return { start: getStartOfMonth(now), end: getEndOfMonth(now) };
        default:
          return { start: getToday(), end: getToday() };
      }
    },
    [],
  );

  const computeGoalProgress = useCallback(
    async (goal: Goal): Promise<GoalWithProgress> => {
      const { start, end } = getDateRangeForGoal(goal.goal_type);
      const stats = await dbService.getWeekStats(
        `${start}T00:00:00`,
        `${end}T23:59:59`,
      );

      let totalMinutes = stats.total_minutes as number;

      // If goal is scoped to a specific job, use only that job's minutes
      if (goal.job_id && stats.by_job) {
        const jobEntry = (
          stats.by_job as { job_id: string; minutes: number }[]
        ).find((j) => j.job_id === goal.job_id);
        totalMinutes = jobEntry ? jobEntry.minutes : 0;
      }

      const currentHours = totalMinutes / 60;
      const progressPercent =
        goal.target_hours > 0
          ? Math.round((currentHours / goal.target_hours) * 100)
          : 0;

      return {
        ...goal,
        current_hours: currentHours,
        progress_percent: progressPercent,
      };
    },
    [getDateRangeForGoal],
  );

  // ---------- weekly score ----------

  const loadWeeklyScore = useCallback(async () => {
    const now = new Date();
    const weekStart = getStartOfWeek(now);
    const dayLabels = [
      t('common.weekdayMon'), t('common.weekdayTue'), t('common.weekdayWed'),
      t('common.weekdayThu'), t('common.weekdayFri'), t('common.weekdaySat'), t('common.weekdaySun'),
    ];
    const days: DayScore[] = [];
    let total = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStats = await dbService.getDayStats(dateStr);
      const logged = (dayStats?.total_minutes ?? 0) > 0;
      total += dayStats?.total_minutes ?? 0;
      days.push({ label: dayLabels[i], logged });
    }

    setWeekDays(days);
    setWeekTotalMinutes(total);

    // Compute a rough target: sum up all weekly goals target hours * 60
    const rawGoals = await dbService.getGoals();
    const weeklyTarget = rawGoals
      .filter((g: Goal) => g.goal_type === 'weekly')
      .reduce((acc: number, g: Goal) => acc + g.target_hours * 60, 0);
    setWeekTargetMinutes(weeklyTarget || 40 * 60); // fallback 40h
  }, [t]);

  // ---------- data loading ----------

  const loadData = useCallback(async () => {
    const [rawGoals, ach, gam] = await Promise.all([
      dbService.getGoals(),
      dbService.getAchievements(),
      dbService.getGamification(),
    ]);

    const goalsWithProgress = await Promise.all(
      rawGoals.map((g: Goal) => computeGoalProgress(g)),
    );

    setGoals(goalsWithProgress);
    setAchievements(ach);
    setGamification(gam);
    await loadWeeklyScore();
  }, [computeGoalProgress, loadWeeklyScore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- actions ----------

  const handleAddGoal = async () => {
    if (!formName || !formHours) return;
    await dbService.createGoal({
      name: formName,
      goal_type: formType,
      target_hours: parseFloat(formHours),
      job_id: formJobId || null,
    });
    setIsDialogOpen(false);
    setFormName('');
    setFormType('weekly');
    setFormHours('40');
    setFormJobId('');
    loadData();
  };

  const handleDeleteGoal = async (id: string) => {
    await dbService.deleteGoal(id);
    loadData();
  };

  // ---------- derived ----------

  const currentXPInLevel = gamification ? xpProgress(gamification.xp, gamification.level) : 0;
  const xpNeeded = gamification ? xpForLevel(gamification.level) : 100;
  const xpFraction = xpNeeded > 0 ? currentXPInLevel / 100 : 0;

  const unlockedCount = achievements.filter((a) => a.unlocked_at).length;

  const weekPercent =
    weekTargetMinutes > 0
      ? Math.round((weekTotalMinutes / weekTargetMinutes) * 100)
      : 0;

  const weekRating = (() => {
    if (weekPercent >= 100) return t('goals.weekRatingExcellent');
    if (weekPercent >= 80) return t('goals.weekRatingGreat');
    if (weekPercent >= 50) return t('goals.weekRatingGood');
    return t('goals.weekRatingKeepGoing');
  })();

  // ---------- render ----------

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{t('goals.title')}</h1>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={() => setIsDialogOpen(true)}
        >
          {t('goals.addGoal')}
        </Button>
      </div>

      {/* ===== 1. Gamification Overview ===== */}
      {gamification && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {/* Level + XP */}
          <Card
            className="stat-card"
            style={{ background: tokens.colorNeutralBackground1 }}
          >
            <div className="stat-card-label">{t('gamification.level')}</div>
            <div
              className="stat-card-value"
              style={{ color: tokens.colorBrandForeground1 }}
            >
              <StarFilled
                style={{
                  marginRight: 6,
                  color: tokens.colorPaletteYellowForeground1,
                  fontSize: 24,
                }}
              />
              {gamification.level}
            </div>
            <ProgressBar
              value={Math.min(xpFraction, 1)}
              thickness="large"
              color="brand"
            />
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {currentXPInLevel} / 100 {t('gamification.xp')} →{' '}
              {t('gamification.nextLevel')}
            </div>
          </Card>

          {/* Streak */}
          <Card
            className="stat-card"
            style={{ background: tokens.colorNeutralBackground1 }}
          >
            <div className="stat-card-label">{t('gamification.streak')}</div>
            <div className="stat-card-value" style={{ color: '#f59e0b' }}>
              🔥 {gamification.current_streak}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {t('goals.longestStreak')}: {gamification.longest_streak}{' '}
              {t('dashboard.days')}
            </div>
          </Card>

          {/* Achievements count */}
          <Card
            className="stat-card"
            style={{ background: tokens.colorNeutralBackground1 }}
          >
            <div className="stat-card-label">
              {t('gamification.achievements')}
            </div>
            <div className="stat-card-value">
              🏆 {unlockedCount}/{achievements.length}
            </div>
          </Card>
        </div>
      )}

      {/* ===== 2. Active Goals ===== */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        {t('goals.title')}
      </h2>
      <div className="entries-list" style={{ marginBottom: 32 }}>
        {goals.length === 0 ? (
          <Card
            style={{
              padding: 32,
              textAlign: 'center',
              background: tokens.colorNeutralBackground1,
              opacity: 0.5,
            }}
          >
            {t('common.noData')}
          </Card>
        ) : (
          goals.map((goal) => {
            const isComplete = goal.progress_percent >= 100;
            const goalTooltipKey = goal.goal_type === 'daily'
              ? 'tooltip.goalDaily'
              : goal.goal_type === 'weekly'
                ? 'tooltip.goalWeekly'
                : 'tooltip.goalMonthly';
            return (
              <Tooltip content={t(goalTooltipKey)} relationship="description" key={goal.id}>
              <Card
                style={{
                  padding: 16,
                  background: tokens.colorNeutralBackground1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {goal.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Badge appearance="outline" size="small">
                        {goal.goal_type === 'daily'
                          ? t('goals.daily')
                          : goal.goal_type === 'weekly'
                            ? t('goals.weekly')
                            : t('goals.monthly')}
                      </Badge>
                      <span style={{ fontSize: 13, opacity: 0.6 }}>
                        {goal.current_hours.toFixed(1)}h / {goal.target_hours}h (
                        {goal.progress_percent}%)
                      </span>
                      {isComplete && (
                        <Badge
                          appearance="filled"
                          color="success"
                          size="small"
                        >
                          {t('goals.achieved')}
                        </Badge>
                      )}
                    </div>
                    <ProgressBar
                      value={Math.min(goal.progress_percent / 100, 1)}
                      thickness="large"
                      color={isComplete ? 'success' : 'brand'}
                    />
                  </div>
                  <Tooltip
                    content={t('common.delete')}
                    relationship="label"
                  >
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<DeleteRegular />}
                      onClick={() => handleDeleteGoal(goal.id)}
                      style={{ marginLeft: 12 }}
                    />
                  </Tooltip>
                </div>
              </Card>
              </Tooltip>
            );
          })
        )}
      </div>

      {/* ===== 3. Weekly Score Summary ===== */}
      <Tooltip content={t('tooltip.weekScore')} relationship="description">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        {t('gamification.weeklyScore')}
      </h2>
      </Tooltip>
      <Card
        style={{
          padding: 20,
          marginBottom: 32,
          background: tokens.colorNeutralBackground1,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginBottom: 16,
          }}
        >
          {weekDays.map((day) => (
            <div
              key={day.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                {day.label}
              </span>
              {day.logged ? (
                <CheckmarkCircleFilled
                  style={{
                    color: tokens.colorPaletteGreenForeground1,
                    fontSize: 24,
                  }}
                />
              ) : (
                <DismissCircleFilled
                  style={{
                    color: tokens.colorPaletteRedForeground1,
                    fontSize: 24,
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: tokens.colorBrandForeground1,
          }}
        >
          {formatMinutes(weekTotalMinutes)} / {formatMinutes(weekTargetMinutes)}{' '}
          ({weekPercent}%) — {weekRating}
        </div>
      </Card>

      {/* ===== 4. Achievements Grid ===== */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        <TrophyRegular style={{ marginRight: 8 }} />
        {t('gamification.achievements')}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 32,
        }}
      >
        {achievements.map((ach) => {
          const isUnlocked = !!ach.unlocked_at;
          return (
            <Card
              key={ach.id}
              style={{
                padding: 16,
                background: isUnlocked
                  ? tokens.colorNeutralBackground1
                  : tokens.colorNeutralBackground3,
                opacity: isUnlocked ? 1 : 0.4,
                filter: isUnlocked ? 'none' : 'grayscale(1)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span style={{ fontSize: 28, flexShrink: 0 }}>
                  {ach.icon || '🏅'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {ach.name}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {ach.description}
                  </div>
                  {isUnlocked && (
                    <Badge
                      appearance="filled"
                      color="success"
                      size="small"
                      style={{ marginTop: 4 }}
                    >
                      {t('gamification.unlocked')}{' '}
                      {new Date(ach.unlocked_at!).toLocaleDateString()}
                    </Badge>
                  )}
                  {!isUnlocked && (
                    <Badge
                      appearance="outline"
                      size="small"
                      style={{ marginTop: 4 }}
                    >
                      {t('gamification.locked')}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ===== Add Goal Dialog ===== */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(_, data) => setIsDialogOpen(data.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('goals.addGoal')}</DialogTitle>
            <DialogContent>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  marginTop: 12,
                }}
              >
                {/* Name */}
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>
                    {t('manage.name')}
                  </label>
                  <Input
                    value={formName}
                    onChange={(_, data) => setFormName(data.value)}
                    placeholder={t('manage.name')}
                  />
                </div>

                {/* Type */}
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>
                    {t('goals.goalType')}
                  </label>
                  <Dropdown
                    value={
                      formType === 'daily'
                        ? t('goals.daily')
                        : formType === 'weekly'
                          ? t('goals.weekly')
                          : t('goals.monthly')
                    }
                    selectedOptions={[formType]}
                    onOptionSelect={(_, data) =>
                      setFormType(data.optionValue as string)
                    }
                  >
                    <Option value="daily" text={t('goals.daily')}>
                      {t('goals.daily')}
                    </Option>
                    <Option value="weekly" text={t('goals.weekly')}>
                      {t('goals.weekly')}
                    </Option>
                    <Option value="monthly" text={t('goals.monthly')}>
                      {t('goals.monthly')}
                    </Option>
                  </Dropdown>
                </div>

                {/* Target hours */}
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>
                    {t('goals.targetHours')}
                  </label>
                  <Input
                    type="number"
                    value={formHours}
                    onChange={(_, data) => setFormHours(data.value)}
                    min="0"
                    step="0.5"
                  />
                </div>

                {/* Optional job filter */}
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>
                    {t('entries.job')}
                  </label>
                  <Dropdown
                    placeholder={t('timer.selectJob')}
                    value={
                      activeJobs.find((j) => j.id === formJobId)?.name || ''
                    }
                    selectedOptions={formJobId ? [formJobId] : []}
                    onOptionSelect={(_, data) =>
                      setFormJobId(data.optionValue as string)
                    }
                    clearable
                  >
                    {activeJobs.map((job) => (
                      <Option key={job.id} value={job.id} text={job.name}>
                        {job.name}
                      </Option>
                    ))}
                  </Dropdown>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{t('common.cancel')}</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={handleAddGoal}
                disabled={!formName || !formHours}
              >
                {t('common.save')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
