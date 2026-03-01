import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  tokens,
  Dropdown,
  Option,
  Button,
  Spinner,
} from '@fluentui/react-components';
import {
  ArrowDownloadRegular,
  CalendarMonthRegular,
  FilterRegular,
} from '@fluentui/react-icons';
import ReactECharts from 'echarts-for-react';
import { useDataStore } from '@/stores/dataStore';
import * as dbService from '@/services/database';
import {
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  formatMinutes,
  formatDate,
  getDayName,
} from '@/utils/helpers';
import type { TimeEntry, PeriodStats } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear';

interface DailyBucket {
  date: string;
  totalMinutes: number;
  byJob: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(p: Period): { start: string; end: string } {
  const now = new Date();
  switch (p) {
    case 'thisWeek':
      return {
        start: getStartOfWeek() + 'T00:00:00',
        end: getEndOfWeek() + 'T23:59:59',
      };
    case 'lastWeek': {
      const lw = new Date(now);
      lw.setDate(lw.getDate() - 7);
      return {
        start: getStartOfWeek(lw) + 'T00:00:00',
        end: getEndOfWeek(lw) + 'T23:59:59',
      };
    }
    case 'thisMonth':
      return {
        start: getStartOfMonth() + 'T00:00:00',
        end: getEndOfMonth() + 'T23:59:59',
      };
    case 'lastMonth': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        start: getStartOfMonth(lm) + 'T00:00:00',
        end: getEndOfMonth(lm) + 'T23:59:59',
      };
    }
    case 'thisYear':
      return {
        start: `${now.getFullYear()}-01-01T00:00:00`,
        end: `${now.getFullYear()}-12-31T23:59:59`,
      };
  }
}

/** Build daily buckets from raw entries, optionally grouped by job. */
function buildDailyBuckets(
  entries: TimeEntry[],
  startDate: string,
  endDate: string,
): DailyBucket[] {
  const map = new Map<string, DailyBucket>();

  // Pre-fill every day in range
  const cur = new Date(startDate.split('T')[0]);
  const last = new Date(endDate.split('T')[0]);
  while (cur <= last) {
    const ds = cur.toISOString().split('T')[0];
    map.set(ds, { date: ds, totalMinutes: 0, byJob: {} });
    cur.setDate(cur.getDate() + 1);
  }

  for (const e of entries) {
    const day = e.start_time.split('T')[0];
    let bucket = map.get(day);
    if (!bucket) {
      bucket = { date: day, totalMinutes: 0, byJob: {} };
      map.set(day, bucket);
    }
    const dur = e.duration_minutes ?? 0;
    bucket.totalMinutes += dur;
    const jid = e.job_id ?? '__none__';
    bucket.byJob[jid] = (bucket.byJob[jid] ?? 0) + dur;
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Simple linear regression returning [slope, intercept]. */
function linearRegression(ys: number[]): [number, number] {
  const n = ys.length;
  if (n === 0) return [0, 0];
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += ys[i];
    sxx += i * i;
    sxy += i * ys[i];
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return [0, sy / n];
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return [slope, intercept];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { jobs } = useDataStore();

  // State
  const [period, setPeriod] = useState<Period>('thisWeek');
  const [jobFilter, setJobFilter] = useState<string | null>(null);
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [dailyBuckets, setDailyBuckets] = useState<DailyBucket[]>([]);
  const [yearHeatmap, setYearHeatmap] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(false);

  // Derived
  const range = useMemo(() => getDateRange(period), [period]);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = range;

      // Load period stats
      const periodStats: PeriodStats = await dbService.getWeekStats(start, end);
      setStats(periodStats);

      // Load raw entries for daily breakdown
      const raw: TimeEntry[] = await dbService.getTimeEntries({
        startDate: start,
        endDate: end,
        ...(jobFilter ? { jobId: jobFilter } : {}),
      });
      setEntries(raw);

      const buckets = buildDailyBuckets(raw, start, end);
      setDailyBuckets(buckets);

      // Heatmap: always load full current year
      const year = new Date().getFullYear();
      const yearEntries: TimeEntry[] = await dbService.getTimeEntries({
        startDate: `${year}-01-01T00:00:00`,
        endDate: `${year}-12-31T23:59:59`,
      });
      const hm = new Map<string, number>();
      for (const e of yearEntries) {
        const d = e.start_time.split('T')[0];
        hm.set(d, (hm.get(d) ?? 0) + (e.duration_minutes ?? 0));
      }
      setYearHeatmap(Array.from(hm.entries()).map(([d, m]) => [d, +(m / 60).toFixed(1)]));
    } finally {
      setLoading(false);
    }
  }, [range, jobFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Computed summary values
  // -----------------------------------------------------------------------

  const totalMinutes = useMemo(() => {
    if (jobFilter) {
      return entries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
    }
    return stats?.total_minutes ?? 0;
  }, [stats, entries, jobFilter]);

  const productiveDays = useMemo(
    () => dailyBuckets.filter((b) => b.totalMinutes > 0).length,
    [dailyBuckets],
  );

  const avgDaily = useMemo(
    () => (productiveDays > 0 ? totalMinutes / productiveDays : 0),
    [totalMinutes, productiveDays],
  );

  const totalEntries = useMemo(
    () => (jobFilter ? entries.length : stats?.entries_count ?? 0),
    [stats, entries, jobFilter],
  );

  const hasData = totalMinutes > 0;

  // -----------------------------------------------------------------------
  // Unique job list used in stacked bar
  // -----------------------------------------------------------------------

  const jobList = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>();
    for (const e of entries) {
      if (e.job_id && !seen.has(e.job_id)) {
        seen.set(e.job_id, {
          name: e.job_name ?? e.job_id,
          color: e.job_color ?? tokens.colorBrandBackground,
        });
      }
    }
    return Array.from(seen.entries()).map(([id, v]) => ({ id, ...v }));
  }, [entries]);

  // -----------------------------------------------------------------------
  // Chart labels (x-axis)
  // -----------------------------------------------------------------------

  const xLabels = useMemo(
    () => dailyBuckets.map((b) => formatDate(b.date)),
    [dailyBuckets],
  );

  // -----------------------------------------------------------------------
  // 1. Stacked daily hours bar chart
  // -----------------------------------------------------------------------

  const dailyBarOption = useMemo(() => {
    const series = jobList.map((job) => ({
      name: job.name,
      type: 'bar' as const,
      stack: 'hours',
      emphasis: { focus: 'series' as const },
      itemStyle: { color: job.color, borderRadius: [2, 2, 0, 0] },
      data: dailyBuckets.map((b) => +((b.byJob[job.id] ?? 0) / 60).toFixed(2)),
    }));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          let html = `<b>${params[0]?.axisValue}</b><br/>`;
          let total = 0;
          for (const p of params) {
            if (p.value > 0) {
              html += `${p.marker} ${p.seriesName}: ${p.value.toFixed(1)}h<br/>`;
              total += p.value;
            }
          }
          html += `<b>${t('analytics.totalTracked')}: ${total.toFixed(1)}h</b>`;
          return html;
        },
      },
      legend: {
        data: jobList.map((j) => j.name),
        bottom: 0,
        textStyle: { color: tokens.colorNeutralForeground1 },
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: { color: tokens.colorNeutralForeground2 },
      },
      yAxis: {
        type: 'value',
        name: t('common.hours'),
        axisLabel: {
          color: tokens.colorNeutralForeground2,
          formatter: (v: number) => `${v}h`,
        },
      },
      series,
      grid: { left: 50, right: 16, top: 24, bottom: 40 },
    };
  }, [dailyBuckets, jobList, xLabels, t]);

  // -----------------------------------------------------------------------
  // 2. Job donut
  // -----------------------------------------------------------------------

  const jobDonutOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: {
      orient: 'vertical' as const,
      right: 0,
      top: 'center',
      textStyle: { color: tokens.colorNeutralForeground1 },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: tokens.colorNeutralBackground1, borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 'bold' } },
        data: (stats?.by_job ?? []).map((j) => ({
          value: Math.round(j.minutes),
          name: j.job_name,
          itemStyle: { color: j.color },
        })),
      },
    ],
  }), [stats]);

  // -----------------------------------------------------------------------
  // 3. Project donut
  // -----------------------------------------------------------------------

  const projectDonutOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: {
      orient: 'vertical' as const,
      right: 0,
      top: 'center',
      textStyle: { color: tokens.colorNeutralForeground1 },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: tokens.colorNeutralBackground1, borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 'bold' } },
        data: (stats?.by_project ?? []).map((p) => ({
          value: Math.round(p.minutes),
          name: p.project_name,
          itemStyle: { color: p.color },
        })),
      },
    ],
  }), [stats]);

  // -----------------------------------------------------------------------
  // 4. Category horizontal bar
  // -----------------------------------------------------------------------

  const categoryBarOption = useMemo(() => {
    const cats = (stats?.by_category ?? []).sort((a, b) => b.minutes - a.minutes);
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const p = params[0];
          return `${p.name}: ${(p.value as number).toFixed(1)}h`;
        },
      },
      xAxis: {
        type: 'value',
        name: t('common.hours'),
        axisLabel: {
          color: tokens.colorNeutralForeground2,
          formatter: (v: number) => `${v}h`,
        },
      },
      yAxis: {
        type: 'category',
        data: cats.map((c) => c.category_name),
        axisLabel: { color: tokens.colorNeutralForeground2 },
      },
      series: [
        {
          type: 'bar',
          data: cats.map((c) => ({
            value: +(c.minutes / 60).toFixed(2),
            itemStyle: { color: c.color, borderRadius: [0, 4, 4, 0] },
          })),
        },
      ],
      grid: { left: 120, right: 24, top: 16, bottom: 24 },
    };
  }, [stats, t]);

  // -----------------------------------------------------------------------
  // 5. Year heatmap calendar
  // -----------------------------------------------------------------------

  const year = new Date().getFullYear();
  const maxHeatVal = useMemo(
    () => Math.max(1, ...yearHeatmap.map(([, v]) => v)),
    [yearHeatmap],
  );

  const heatmapOption = useMemo(
    () => ({
      tooltip: {
        formatter: (params: any) => {
          const val = params.value as [string, number];
          return `${val[0]}: ${val[1]}h`;
        },
      },
      visualMap: {
        min: 0,
        max: maxHeatVal,
        calculable: true,
        orient: 'horizontal' as const,
        left: 'center',
        bottom: 0,
        inRange: {
          color: [tokens.colorNeutralBackground3, tokens.colorBrandBackground],
        },
        textStyle: { color: tokens.colorNeutralForeground2 },
      },
      calendar: {
        top: 30,
        left: 50,
        right: 30,
        cellSize: ['auto', 16],
        range: String(year),
        itemStyle: {
          borderWidth: 3,
          borderColor: tokens.colorNeutralBackground1,
        },
        splitLine: { show: false },
        dayLabel: {
          nameMap: 'en',
          color: tokens.colorNeutralForeground3,
        },
        monthLabel: {
          color: tokens.colorNeutralForeground2,
        },
        yearLabel: { show: false },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: yearHeatmap,
        },
      ],
    }),
    [yearHeatmap, maxHeatVal, year],
  );

  // -----------------------------------------------------------------------
  // 6. Trend line chart
  // -----------------------------------------------------------------------

  const trendOption = useMemo(() => {
    const hours = dailyBuckets.map((b) => +(b.totalMinutes / 60).toFixed(2));
    const [slope, intercept] = linearRegression(hours);
    const trendData = hours.map((_, i) => +(slope * i + intercept).toFixed(2));

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          let html = `<b>${params[0]?.axisValue}</b><br/>`;
          for (const p of params) {
            html += `${p.marker} ${p.seriesName}: ${(p.value as number).toFixed(1)}h<br/>`;
          }
          return html;
        },
      },
      legend: {
        data: [t('analytics.trends'), t('analytics.averageDaily')],
        bottom: 0,
        textStyle: { color: tokens.colorNeutralForeground1 },
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        boundaryGap: false,
        axisLabel: { color: tokens.colorNeutralForeground2 },
      },
      yAxis: {
        type: 'value',
        name: t('common.hours'),
        axisLabel: {
          color: tokens.colorNeutralForeground2,
          formatter: (v: number) => `${v}h`,
        },
      },
      series: [
        {
          name: t('analytics.trends'),
          type: 'line',
          data: hours,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: tokens.colorBrandBackground },
          itemStyle: { color: tokens.colorBrandBackground },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: tokens.colorBrandBackground + '40' },
                { offset: 1, color: tokens.colorBrandBackground + '05' },
              ],
            },
          },
        },
        {
          name: t('analytics.averageDaily'),
          type: 'line',
          data: trendData,
          smooth: false,
          symbol: 'none',
          lineStyle: { width: 2, type: 'dashed' as const, color: tokens.colorPaletteRedBorderActive },
        },
      ],
      grid: { left: 50, right: 16, top: 24, bottom: 40 },
    };
  }, [dailyBuckets, xLabels, t]);

  // -----------------------------------------------------------------------
  // Period options
  // -----------------------------------------------------------------------

  const periodOptions: { key: Period; label: string }[] = [
    { key: 'thisWeek', label: t('analytics.thisWeek') },
    { key: 'lastWeek', label: t('analytics.lastWeek') },
    { key: 'thisMonth', label: t('analytics.thisMonth') },
    { key: 'lastMonth', label: t('analytics.lastMonth') },
    { key: 'thisYear', label: t('analytics.thisYear') },
  ];

  // -----------------------------------------------------------------------
  // Export handler
  // -----------------------------------------------------------------------

  const handleExport = async () => {
    try {
      await (window as any).electronAPI?.app?.exportData?.();
    } catch {
      // silently ignore if method unavailable
    }
  };

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  const EmptyState = ({ height = 300 }: { height?: number }) => (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tokens.colorNeutralForeground4,
        fontSize: 14,
      }}
    >
      {t('common.noData')}
    </div>
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{t('analytics.title')}</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <Dropdown
            value={periodOptions.find((p) => p.key === period)?.label ?? ''}
            selectedOptions={[period]}
            onOptionSelect={(_, data) => setPeriod(data.optionValue as Period)}
            style={{ minWidth: 180 }}
          >
            {periodOptions.map((opt) => (
              <Option key={opt.key} value={opt.key} text={opt.label}>
                {opt.label}
              </Option>
            ))}
          </Dropdown>

          {/* Job filter */}
          <Dropdown
            value={
              jobFilter
                ? jobs.find((j) => j.id === jobFilter)?.name ?? ''
                : t('analytics.byJob')
            }
            selectedOptions={jobFilter ? [jobFilter] : []}
            onOptionSelect={(_, data) => {
              const val = data.optionValue as string;
              setJobFilter(val === '__all__' ? null : val);
            }}
            style={{ minWidth: 180 }}
          >
            <Option key="__all__" value="__all__" text={t('analytics.byJob')}>
              — {t('analytics.byJob')} —
            </Option>
            {jobs.map((j) => (
              <Option key={j.id} value={j.id} text={j.name}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: j.color,
                    marginRight: 8,
                  }}
                />
                {j.name}
              </Option>
            ))}
          </Dropdown>

          {/* Export */}
          <Button
            appearance="secondary"
            icon={<ArrowDownloadRegular />}
            onClick={handleExport}
          >
            {t('analytics.export')}
          </Button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" label={t('common.loading')} />
        </div>
      )}

      {!loading && !hasData && (
        <Card style={{ padding: 48, background: tokens.colorNeutralBackground1, textAlign: 'center' }}>
          <CalendarMonthRegular style={{ fontSize: 48, color: tokens.colorNeutralForeground4, marginBottom: 12 }} />
          <div style={{ color: tokens.colorNeutralForeground3, fontSize: 16 }}>
            {t('entries.noEntries')}
          </div>
        </Card>
      )}

      {!loading && hasData && (
        <>
          {/* Summary Cards */}
          <div className="stats-grid">
            <Card className="stat-card" style={{ background: tokens.colorNeutralBackground1 }}>
              <div className="stat-card-label">{t('analytics.totalTracked')}</div>
              <div className="stat-card-value" style={{ color: tokens.colorBrandForeground1 }}>
                {formatMinutes(totalMinutes)}
              </div>
            </Card>
            <Card className="stat-card" style={{ background: tokens.colorNeutralBackground1 }}>
              <div className="stat-card-label">{t('analytics.averageDaily')}</div>
              <div className="stat-card-value" style={{ color: tokens.colorBrandForeground1 }}>
                {formatMinutes(avgDaily)}
              </div>
            </Card>
            <Card className="stat-card" style={{ background: tokens.colorNeutralBackground1 }}>
              <div className="stat-card-label">{t('analytics.mostProductiveDay')}</div>
              <div className="stat-card-value">{productiveDays}</div>
            </Card>
            <Card className="stat-card" style={{ background: tokens.colorNeutralBackground1 }}>
              <div className="stat-card-label">{t('entries.title')}</div>
              <div className="stat-card-value">{totalEntries}</div>
            </Card>
          </div>

          {/* Charts 2×2 grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 16,
            }}
          >
            {/* Daily stacked bar — full width */}
            <Card
              style={{
                padding: 20,
                background: tokens.colorNeutralBackground1,
                gridColumn: '1 / -1',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                {t('analytics.trends')}
              </h3>
              <ReactECharts option={dailyBarOption} style={{ height: 300 }} />
            </Card>

            {/* Job donut */}
            <Card style={{ padding: 20, background: tokens.colorNeutralBackground1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                {t('analytics.byJob')}
              </h3>
              {(stats?.by_job?.length ?? 0) > 0 ? (
                <ReactECharts option={jobDonutOption} style={{ height: 300 }} />
              ) : (
                <EmptyState />
              )}
            </Card>

            {/* Project donut */}
            <Card style={{ padding: 20, background: tokens.colorNeutralBackground1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                {t('analytics.byProject')}
              </h3>
              {(stats?.by_project?.length ?? 0) > 0 ? (
                <ReactECharts option={projectDonutOption} style={{ height: 300 }} />
              ) : (
                <EmptyState />
              )}
            </Card>

            {/* Category horizontal bar — full width */}
            <Card
              style={{
                padding: 20,
                background: tokens.colorNeutralBackground1,
                gridColumn: '1 / -1',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                {t('analytics.byCategory')}
              </h3>
              {(stats?.by_category?.length ?? 0) > 0 ? (
                <ReactECharts
                  option={categoryBarOption}
                  style={{ height: Math.max(200, (stats?.by_category?.length ?? 1) * 40) }}
                />
              ) : (
                <EmptyState height={200} />
              )}
            </Card>
          </div>

          {/* Heatmap calendar */}
          <Card style={{ padding: 20, background: tokens.colorNeutralBackground1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              {t('analytics.heatmap')} — {year}
            </h3>
            {yearHeatmap.length > 0 ? (
              <ReactECharts option={heatmapOption} style={{ height: 200 }} />
            ) : (
              <EmptyState height={200} />
            )}
          </Card>

          {/* Trend line */}
          <Card style={{ padding: 20, background: tokens.colorNeutralBackground1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              {t('analytics.comparison')}
            </h3>
            <ReactECharts option={trendOption} style={{ height: 300 }} />
          </Card>
        </>
      )}
    </div>
  );
}
