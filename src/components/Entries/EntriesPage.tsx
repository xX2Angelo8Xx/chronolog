import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Input,
  Dropdown,
  Option,
  Textarea,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  tokens,
  Badge,
  Checkbox,
  Tooltip,
  Divider,
  makeStyles,
  shorthands,
  mergeClasses,
} from '@fluentui/react-components';
import {
  AddRegular,
  DeleteRegular,
  EditRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  CalendarTodayRegular,
  SearchRegular,
  FilterRegular,
  ReOrderDotsVerticalRegular,
  ClockRegular,
  CheckmarkRegular,
  DismissRegular,
  DeleteDismissRegular,
  CalendarWeekNumbersRegular,
  NoteRegular,
  TagRegular,
} from '@fluentui/react-icons';
import { useDataStore } from '@/stores/dataStore';
import * as dbService from '@/services/database';
import { formatTime, formatMinutes, formatDate, getToday, COLOR_PALETTE } from '@/utils/helpers';
import type { TimeEntry, Break, Tag } from '@/types';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    height: '100%',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('12px'),
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: tokens.colorNeutralForeground1,
    ...shorthands.margin('0'),
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  dateNavCard: {
    ...shorthands.padding('12px', '20px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  dateNavRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateCenter: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
  },
  totalHours: {
    fontSize: '14px',
    opacity: 0.7,
    color: tokens.colorNeutralForeground2,
    fontWeight: '500',
  },
  weekBar: {
    display: 'flex',
    alignItems: 'stretch',
    ...shorthands.gap('4px'),
    marginTop: '12px',
  },
  weekDay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.flex(1),
    cursor: 'pointer',
    ...shorthands.padding('6px', '4px'),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    transitionProperty: 'background',
    transitionDuration: '0.15s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  weekDaySelected: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
  },
  weekDayLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  weekDayHours: {
    fontSize: '12px',
    marginTop: '2px',
    opacity: 0.8,
  },
  weekDayBar: {
    width: '100%',
    height: '3px',
    marginTop: '4px',
    ...shorthands.borderRadius('2px'),
    backgroundColor: tokens.colorNeutralBackground4,
  },
  weekDayBarFill: {
    height: '100%',
    ...shorthands.borderRadius('2px'),
    backgroundColor: tokens.colorBrandBackground,
    transitionProperty: 'width',
    transitionDuration: '0.3s',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    ...shorthands.padding('8px', '16px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  bulkBar: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    ...shorthands.padding('8px', '16px'),
    backgroundColor: tokens.colorPaletteRedBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  entriesList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  entryCard: {
    display: 'flex',
    alignItems: 'stretch',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.overflow('hidden'),
    transitionProperty: 'box-shadow',
    transitionDuration: '0.15s',
    ':hover': {
      boxShadow: tokens.shadow4,
    },
  },
  entryColorBar: {
    width: '4px',
    flexShrink: 0,
  },
  entryGrip: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.padding('0', '4px'),
    color: tokens.colorNeutralForeground4,
    cursor: 'grab',
    opacity: 0.4,
    ':hover': {
      opacity: 0.8,
    },
  },
  entryCheckbox: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '8px',
  },
  entryBody: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.flex(1),
    ...shorthands.padding('12px', '16px'),
    ...shorthands.gap('12px'),
    minWidth: 0,
  },
  entryInfo: {
    ...shorthands.flex(1),
    minWidth: 0,
  },
  entryTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    fontWeight: '600',
    fontSize: '14px',
    color: tokens.colorNeutralForeground1,
    flexWrap: 'wrap',
  },
  entryMeta: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    marginTop: '4px',
    flexWrap: 'wrap',
  },
  entryNote: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    marginTop: '4px',
    whiteSpace: 'nowrap',
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    maxWidth: '400px',
  },
  breakBadges: {
    display: 'flex',
    ...shorthands.gap('6px'),
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  breakBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    fontSize: '11px',
    ...shorthands.padding('2px', '8px'),
    ...shorthands.borderRadius('12px'),
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
  tagBadges: {
    display: 'flex',
    ...shorthands.gap('4px'),
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  entryDuration: {
    fontWeight: '600',
    fontSize: '14px',
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    marginRight: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    ...shorthands.gap('2px'),
  },
  entryTimeRange: {
    fontSize: '12px',
    fontWeight: '400',
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  entryActions: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    paddingRight: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('64px', '24px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.3,
    color: tokens.colorNeutralForeground3,
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: tokens.colorNeutralForeground2,
    marginBottom: '8px',
  },
  emptyDescription: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
    marginBottom: '20px',
    maxWidth: '320px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('16px'),
    marginTop: '16px',
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
  },
  formLabel: {
    fontWeight: '600',
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
  },
  formRequired: {
    color: tokens.colorPaletteRedForeground1,
    marginLeft: '2px',
  },
  durationPreview: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    gridColumn: 'span 2',
    ...shorthands.padding('8px', '12px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
  },
  colorDot: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    ...shorthands.borderRadius('50%'),
    marginRight: '8px',
    flexShrink: 0,
  },
  runningPulse: {
    width: '8px',
    height: '8px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: tokens.colorPaletteGreenBackground3,
    animationName: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.3 },
    },
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
  },
});

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(dateStr: string): string[] {
  const date = new Date(dateStr);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function calcDurationMinutes(startTime: string, endTime: string, dateStr: string): number {
  const start = new Date(`${dateStr}T${startTime}:00`);
  const end = new Date(`${dateStr}T${endTime}:00`);
  return Math.max(0, (end.getTime() - start.getTime()) / 60000);
}

export function EntriesPage() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { jobs, projects, categories, tags } = useDataStore();

  // State
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [showWeekView, setShowWeekView] = useState(false);
  const [weekHours, setWeekHours] = useState<Record<string, number>>({});

  // Filter state
  const [filterJobId, setFilterJobId] = useState('');
  const [searchNote, setSearchNote] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Form state
  const [formJobId, setFormJobId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDate, setFormDate] = useState(selectedDate);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('17:00');
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formNote, setFormNote] = useState('');

  // Derived
  const isToday = selectedDate === getToday();
  const activeJobs = useMemo(() => jobs.filter((j) => !j.is_archived), [jobs]);
  const jobProjects = useMemo(
    () => projects.filter((p) => !p.is_archived && p.job_id === formJobId),
    [projects, formJobId]
  );
  const activeCategories = useMemo(() => categories.filter((c) => !c.is_archived), [categories]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const formDuration = useMemo(() => {
    if (!formStartTime || !formEndTime) return 0;
    return calcDurationMinutes(formStartTime, formEndTime, formDate);
  }, [formStartTime, formEndTime, formDate]);

  // Load entries for selected day
  const loadEntries = useCallback(async () => {
    const startOfDay = `${selectedDate}T00:00:00`;
    const endOfDay = `${selectedDate}T23:59:59`;
    const data = await dbService.getTimeEntries({ startDate: startOfDay, endDate: endOfDay });
    setEntries(data);
    setSelectedIds(new Set());
  }, [selectedDate]);

  // Load week hours when week view is on
  const loadWeekHours = useCallback(async () => {
    if (!showWeekView) return;
    const hours: Record<string, number> = {};
    for (const dayDate of weekDates) {
      const dayStart = `${dayDate}T00:00:00`;
      const dayEnd = `${dayDate}T23:59:59`;
      const dayEntries = await dbService.getTimeEntries({ startDate: dayStart, endDate: dayEnd });
      const totalMins = dayEntries
        .filter((e: TimeEntry) => !e.is_running)
        .reduce((sum: number, e: TimeEntry) => sum + (e.duration_minutes || 0), 0);
      hours[dayDate] = totalMins;
    }
    setWeekHours(hours);
  }, [showWeekView, weekDates]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    loadWeekHours();
  }, [loadWeekHours]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filterJobId) {
      result = result.filter((e) => e.job_id === filterJobId);
    }
    if (searchNote.trim()) {
      const query = searchNote.toLowerCase();
      result = result.filter(
        (e) =>
          e.note?.toLowerCase().includes(query) ||
          e.job_name?.toLowerCase().includes(query) ||
          e.project_name?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [entries, filterJobId, searchNote]);

  const totalMinutes = useMemo(
    () =>
      entries
        .filter((e) => !e.is_running)
        .reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
    [entries]
  );

  const maxWeekMinutes = useMemo(() => Math.max(1, ...Object.values(weekHours), 480), [weekHours]);

  // Navigation
  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Form helpers
  const resetForm = () => {
    setFormJobId('');
    setFormProjectId('');
    setFormCategoryId('');
    setFormDate(selectedDate);
    setFormStartTime('09:00');
    setFormEndTime('17:00');
    setFormTagIds([]);
    setFormNote('');
    setEditingEntry(null);
  };

  const openAddDialog = () => {
    resetForm();
    setFormDate(selectedDate);
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormJobId(entry.job_id);
    setFormProjectId(entry.project_id || '');
    setFormCategoryId(entry.category_id || '');
    setFormDate(entry.start_time ? entry.start_time.split('T')[0] : selectedDate);
    setFormStartTime(entry.start_time ? formatTime(entry.start_time) : '09:00');
    setFormEndTime(entry.end_time ? formatTime(entry.end_time) : '17:00');
    setFormTagIds(entry.tags?.map((tg) => tg.id) || []);
    setFormNote(entry.note || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formJobId) return;

    const startDateTime = `${formDate}T${formStartTime}:00`;
    const endDateTime = `${formDate}T${formEndTime}:00`;
    const durationMinutes = calcDurationMinutes(formStartTime, formEndTime, formDate);

    if (editingEntry) {
      await dbService.updateTimeEntry(editingEntry.id, {
        job_id: formJobId,
        project_id: formProjectId || null,
        category_id: formCategoryId || null,
        start_time: startDateTime,
        end_time: endDateTime,
        duration_minutes: durationMinutes > 0 ? durationMinutes : null,
        note: formNote || undefined,
        tag_ids: formTagIds,
      });
    } else {
      await dbService.createTimeEntry({
        job_id: formJobId,
        project_id: formProjectId || null,
        category_id: formCategoryId || null,
        start_time: startDateTime,
        end_time: endDateTime,
        duration_minutes: durationMinutes > 0 ? durationMinutes : undefined,
        note: formNote || undefined,
        is_manual: true,
        tag_ids: formTagIds,
      });
      await dbService.addXP(5);
    }

    setIsDialogOpen(false);
    resetForm();
    loadEntries();
    if (showWeekView) loadWeekHours();
  };

  const handleDelete = async (id: string) => {
    await dbService.deleteTimeEntry(id);
    loadEntries();
    if (showWeekView) loadWeekHours();
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await dbService.deleteTimeEntry(id);
    }
    setSelectedIds(new Set());
    loadEntries();
    if (showWeekView) loadWeekHours();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
    }
  };

  const hasFilters = filterJobId || searchNote.trim();
  const hasSelection = selectedIds.size > 0;

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('entries.title')}</h1>
        <div className={styles.headerActions}>
          <Tooltip content={t('common.thisWeek')} relationship="label">
            <Button
              appearance={showWeekView ? 'primary' : 'subtle'}
              icon={<CalendarWeekNumbersRegular />}
              onClick={() => setShowWeekView((v) => !v)}
            />
          </Tooltip>
          <Button appearance="primary" icon={<AddRegular />} onClick={openAddDialog}>
            {t('entries.addEntry')}
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className={styles.dateNavCard}>
        <div className={styles.dateNavRow}>
          <Button appearance="subtle" icon={<ChevronLeftRegular />} onClick={() => navigateDay(-1)} />
          <div className={styles.dateCenter}>
            <Input
              type="date"
              value={selectedDate}
              onChange={(_, data) => setSelectedDate(data.value)}
              style={{ width: 180 }}
            />
            {isToday && (
              <Badge appearance="filled" color="brand" size="small" icon={<CalendarTodayRegular />}>
                {t('common.today')}
              </Badge>
            )}
            <span className={styles.totalHours}>
              <ClockRegular style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {formatMinutes(totalMinutes)}
            </span>
          </div>
          <Button appearance="subtle" icon={<ChevronRightRegular />} onClick={() => navigateDay(1)} />
        </div>

        {/* Week View */}
        {showWeekView && (
          <div className={styles.weekBar}>
            {weekDates.map((dayDate, idx) => {
              const mins = weekHours[dayDate] || 0;
              const isSelected = dayDate === selectedDate;
              const fillPct = Math.min(100, (mins / maxWeekMinutes) * 100);
              return (
                <div
                  key={dayDate}
                  className={mergeClasses(styles.weekDay, isSelected && styles.weekDaySelected)}
                  onClick={() => setSelectedDate(dayDate)}
                >
                  <span className={styles.weekDayLabel}>{WEEK_DAYS[idx]}</span>
                  <span className={styles.weekDayHours}>
                    {mins > 0 ? formatMinutes(mins) : '—'}
                  </span>
                  <div className={styles.weekDayBar}>
                    <div
                      className={styles.weekDayBarFill}
                      style={{
                        width: `${fillPct}%`,
                        backgroundColor: isSelected
                          ? tokens.colorNeutralForegroundOnBrand
                          : tokens.colorBrandBackground,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <FilterRegular style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }} />
        <Dropdown
          placeholder={t('entries.job')}
          value={activeJobs.find((j) => j.id === filterJobId)?.name || ''}
          selectedOptions={filterJobId ? [filterJobId] : []}
          onOptionSelect={(_, data) => setFilterJobId((data.optionValue as string) || '')}
          style={{ minWidth: 160 }}
          clearable
        >
          {activeJobs.map((job) => (
            <Option key={job.id} value={job.id} text={job.name}>
              <span className={styles.colorDot} style={{ backgroundColor: job.color }} />
              {job.name}
            </Option>
          ))}
        </Dropdown>
        <Input
          contentBefore={<SearchRegular />}
          placeholder={t('common.search')}
          value={searchNote}
          onChange={(_, data) => setSearchNote(data.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        {hasFilters && (
          <Button
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            onClick={() => {
              setFilterJobId('');
              setSearchNote('');
            }}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      {hasSelection && (
        <div className={styles.bulkBar}>
          <Checkbox
            checked={selectedIds.size === filteredEntries.length ? true : 'mixed'}
            onChange={toggleSelectAll}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: tokens.colorNeutralForeground1, flex: 1 }}>
            {selectedIds.size} {t('entries.title').toLowerCase()} {t('common.edit').toLowerCase()}
          </span>
          <Button
            appearance="subtle"
            icon={<DeleteDismissRegular />}
            onClick={handleBulkDelete}
            style={{ color: tokens.colorPaletteRedForeground1 }}
          >
            {t('common.delete')} ({selectedIds.size})
          </Button>
          <Button
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            onClick={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      {/* Entries List */}
      <div className={styles.entriesList}>
        {filteredEntries.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <ClockRegular style={{ fontSize: 48 }} />
            </div>
            <div className={styles.emptyTitle}>
              {hasFilters ? t('common.noData') : t('entries.noEntries')}
            </div>
            <div className={styles.emptyDescription}>
              {hasFilters
                ? t('common.search')
                : t('entries.quickEntry', { defaultValue: 'Start tracking or add a manual entry to see your work here.' })}
            </div>
            {!hasFilters && (
              <Button appearance="primary" icon={<AddRegular />} onClick={openAddDialog}>
                {t('entries.addEntry')}
              </Button>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className={styles.entryCard}>
              {/* Color bar */}
              <div
                className={styles.entryColorBar}
                style={{ backgroundColor: entry.job_color || COLOR_PALETTE[0] }}
              />

              {/* Grip handle (visual only) */}
              <div className={styles.entryGrip}>
                <ReOrderDotsVerticalRegular fontSize={16} />
              </div>

              {/* Checkbox for bulk select */}
              <div className={styles.entryCheckbox}>
                <Checkbox
                  checked={selectedIds.has(entry.id)}
                  onChange={() => toggleSelect(entry.id)}
                />
              </div>

              {/* Entry body */}
              <div className={styles.entryBody}>
                <div className={styles.entryInfo}>
                  {/* Title row */}
                  <div className={styles.entryTitle}>
                    <span>{entry.project_name || entry.job_name || '—'}</span>
                    {entry.is_manual && (
                      <Badge appearance="outline" size="small" color="informative">
                        {t('entries.manual')}
                      </Badge>
                    )}
                    {entry.is_running && (
                      <Badge
                        appearance="filled"
                        color="success"
                        size="small"
                        icon={<span className={styles.runningPulse} />}
                      >
                        {t('timer.running')}
                      </Badge>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className={styles.entryMeta}>
                    {entry.job_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          className={styles.colorDot}
                          style={{ backgroundColor: entry.job_color || COLOR_PALETTE[0], marginRight: 2 }}
                        />
                        {entry.job_name}
                      </span>
                    )}
                    {entry.category_name && (
                      <>
                        <span>·</span>
                        <span>{entry.category_name}</span>
                      </>
                    )}
                  </div>

                  {/* Note preview */}
                  {entry.note && (
                    <div className={styles.entryNote}>
                      <NoteRegular style={{ marginRight: 4, verticalAlign: 'middle', fontSize: 12 }} />
                      {entry.note}
                    </div>
                  )}

                  {/* Breaks */}
                  {entry.breaks && entry.breaks.length > 0 && (
                    <div className={styles.breakBadges}>
                      {entry.breaks.map((brk: Break) => (
                        <span key={brk.id} className={styles.breakBadge}>
                          {brk.break_type === 'coffee' ? '☕' : '🍽️'}
                          {brk.duration_minutes ? formatMinutes(brk.duration_minutes) : '...'}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className={styles.tagBadges}>
                      {entry.tags.map((tag: Tag) => (
                        <Badge
                          key={tag.id}
                          appearance="tint"
                          size="small"
                          icon={<TagRegular />}
                          style={{
                            backgroundColor: tag.color + '22',
                            color: tag.color,
                            borderColor: tag.color + '44',
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration + time range */}
                <div className={styles.entryDuration}>
                  <span>{entry.duration_minutes ? formatMinutes(entry.duration_minutes) : '—'}</span>
                  <span className={styles.entryTimeRange}>
                    {formatTime(entry.start_time)}
                    {entry.end_time ? ` – ${formatTime(entry.end_time)}` : ''}
                  </span>
                </div>

                {/* Actions */}
                <div className={styles.entryActions}>
                  <Tooltip content={t('common.edit')} relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<EditRegular />}
                      onClick={() => openEditDialog(entry)}
                    />
                  </Tooltip>
                  <Tooltip content={t('common.delete')} relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<DeleteRegular />}
                      onClick={() => handleDelete(entry.id)}
                      style={{ color: tokens.colorPaletteRedForeground1 }}
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(_, data) => setIsDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {editingEntry ? t('entries.editEntry') : t('entries.addEntry')}
            </DialogTitle>
            <DialogContent>
              <div className={styles.formGrid}>
                {/* Job */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    {t('entries.job')}
                    <span className={styles.formRequired}>*</span>
                  </label>
                  <Dropdown
                    placeholder={t('timer.selectJob')}
                    value={activeJobs.find((j) => j.id === formJobId)?.name || ''}
                    selectedOptions={formJobId ? [formJobId] : []}
                    onOptionSelect={(_, data) => {
                      setFormJobId(data.optionValue as string);
                      setFormProjectId('');
                    }}
                  >
                    {activeJobs.map((job) => (
                      <Option key={job.id} value={job.id} text={job.name}>
                        <span className={styles.colorDot} style={{ backgroundColor: job.color }} />
                        {job.name}
                      </Option>
                    ))}
                  </Dropdown>
                </div>

                {/* Project */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('entries.project')}</label>
                  <Dropdown
                    placeholder={t('timer.selectProject')}
                    value={jobProjects.find((p) => p.id === formProjectId)?.name || ''}
                    selectedOptions={formProjectId ? [formProjectId] : []}
                    onOptionSelect={(_, data) => setFormProjectId(data.optionValue as string)}
                    disabled={!formJobId}
                  >
                    {jobProjects.map((p) => (
                      <Option key={p.id} value={p.id} text={p.name}>
                        <span className={styles.colorDot} style={{ backgroundColor: p.color }} />
                        {p.name}
                      </Option>
                    ))}
                  </Dropdown>
                </div>

                {/* Category */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('entries.category')}</label>
                  <Dropdown
                    placeholder={t('timer.selectCategory')}
                    value={activeCategories.find((c) => c.id === formCategoryId)?.name || ''}
                    selectedOptions={formCategoryId ? [formCategoryId] : []}
                    onOptionSelect={(_, data) => setFormCategoryId(data.optionValue as string)}
                  >
                    {activeCategories.map((c) => (
                      <Option key={c.id} value={c.id} text={c.name}>
                        <span className={styles.colorDot} style={{ backgroundColor: c.color }} />
                        {c.name}
                      </Option>
                    ))}
                  </Dropdown>
                </div>

                {/* Date */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('entries.date')}</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(_, data) => setFormDate(data.value)}
                  />
                </div>

                {/* Start Time */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('entries.startTime')}</label>
                  <Input
                    type="time"
                    value={formStartTime}
                    onChange={(_, data) => setFormStartTime(data.value)}
                  />
                </div>

                {/* End Time */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('entries.endTime')}</label>
                  <Input
                    type="time"
                    value={formEndTime}
                    onChange={(_, data) => setFormEndTime(data.value)}
                  />
                </div>

                {/* Duration preview */}
                <div className={styles.durationPreview}>
                  <ClockRegular />
                  <span>
                    {t('entries.duration')}: <strong>{formatMinutes(formDuration)}</strong>
                  </span>
                </div>

                {/* Tags multi-select */}
                <div className={styles.formFieldFull}>
                  <label className={styles.formLabel}>{t('entries.tags')}</label>
                  <Dropdown
                    placeholder={t('entries.tags')}
                    multiselect
                    value={
                      formTagIds
                        .map((id) => tags.find((tg) => tg.id === id)?.name)
                        .filter(Boolean)
                        .join(', ') || ''
                    }
                    selectedOptions={formTagIds}
                    onOptionSelect={(_, data) => {
                      setFormTagIds(data.selectedOptions as string[]);
                    }}
                  >
                    {tags.map((tag) => (
                      <Option key={tag.id} value={tag.id} text={tag.name}>
                        <span
                          className={styles.colorDot}
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </Option>
                    ))}
                  </Dropdown>
                </div>

                {/* Note */}
                <div className={styles.formFieldFull}>
                  <label className={styles.formLabel}>{t('entries.note')}</label>
                  <Textarea
                    placeholder={t('timer.addNote')}
                    value={formNote}
                    onChange={(_, data) => setFormNote(data.value)}
                    resize="vertical"
                    rows={3}
                  />
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                appearance="primary"
                icon={<CheckmarkRegular />}
                onClick={handleSave}
                disabled={!formJobId}
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
