import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  tokens,
  makeStyles,
  shorthands,
  Badge,
  mergeClasses,
} from '@fluentui/react-components';
import {
  SearchRegular,
  BoardRegular,
  TimerRegular,
  CalendarRegular,
  DataPieRegular,
  TargetArrowRegular,
  FolderRegular,
  SettingsRegular,
  PlayRegular,
  StopRegular,
  PauseRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
  DesktopRegular,
  LocalLanguageRegular,
  AddRegular,
} from '@fluentui/react-icons';
import { useAppStore } from '@/stores/appStore';
import { useTimerStore } from '@/stores/timerStore';
import type { NavPage } from '@/types';

interface Command {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
  shortcut?: string;
  section: 'navigation' | 'timer' | 'settings';
  action: () => void;
}

const useStyles = makeStyles({
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '15vh',
    zIndex: 9999,
    animationName: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    animationDuration: '150ms',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'forwards',
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow64,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.overflow('hidden'),
    animationName: {
      from: { opacity: 0, transform: 'scale(0.96) translateY(-8px)' },
      to: { opacity: 1, transform: 'scale(1) translateY(0)' },
    },
    animationDuration: '200ms',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'forwards',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    ...shorthands.padding('16px', '20px'),
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  searchIcon: {
    color: tokens.colorNeutralForeground3,
    fontSize: '20px',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    ...shorthands.border('none'),
    ...shorthands.outline('none'),
    fontSize: '16px',
    color: tokens.colorNeutralForeground1,
    '::placeholder': {
      color: tokens.colorNeutralForeground4,
    },
  },
  commandList: {
    maxHeight: '400px',
    overflowY: 'auto',
    ...shorthands.padding('8px'),
  },
  sectionHeader: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding('8px', '12px', '4px'),
  },
  commandItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    ...shorthands.padding('10px', '12px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '100ms',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  commandItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  commandIcon: {
    fontSize: '18px',
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  commandLabel: {
    flex: 1,
    fontSize: '14px',
    color: tokens.colorNeutralForeground1,
  },
  shortcutBadge: {
    flexShrink: 0,
  },
  emptyState: {
    ...shorthands.padding('24px'),
    textAlign: 'center' as const,
    color: tokens.colorNeutralForeground3,
    fontSize: '14px',
  },
});

const sectionOrder: Command['section'][] = ['navigation', 'timer', 'settings'];

const sectionLabelKeys: Record<Command['section'], string> = {
  navigation: 'commandPalette.sectionNavigation',
  timer: 'commandPalette.sectionTimer',
  settings: 'commandPalette.sectionSettings',
};

export function CommandPalette() {
  const { t } = useTranslation();
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [searchText, setSearchText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { isCommandPaletteOpen, toggleCommandPalette, setPage, setTheme, setLanguage } =
    useAppStore();
  const { status, startTimer, stopTimer, toggleTimer } = useTimerStore();

  const close = useCallback(() => {
    if (isCommandPaletteOpen) {
      toggleCommandPalette();
    }
  }, [isCommandPaletteOpen, toggleCommandPalette]);

  const executeAndClose = useCallback(
    (action: () => void) => {
      action();
      close();
    },
    [close],
  );

  const commands = useMemo<Command[]>(() => {
    const navigateTo = (page: NavPage) => () => setPage(page);

    return [
      // Navigation
      {
        id: 'nav-dashboard',
        icon: <BoardRegular />,
        labelKey: 'nav.dashboard',
        shortcut: undefined,
        section: 'navigation',
        action: navigateTo('dashboard'),
      },
      {
        id: 'nav-timer',
        icon: <TimerRegular />,
        labelKey: 'nav.timer',
        shortcut: undefined,
        section: 'navigation',
        action: navigateTo('timer'),
      },
      {
        id: 'nav-entries',
        icon: <CalendarRegular />,
        labelKey: 'nav.entries',
        shortcut: undefined,
        section: 'navigation',
        action: navigateTo('entries'),
      },
      {
        id: 'nav-analytics',
        icon: <DataPieRegular />,
        labelKey: 'nav.analytics',
        shortcut: undefined,
        section: 'navigation',
        action: navigateTo('analytics'),
      },
      {
        id: 'nav-goals',
        icon: <TargetArrowRegular />,
        labelKey: 'nav.goals',
        shortcut: undefined,
        section: 'navigation',
        action: navigateTo('goals'),
      },
      {
        id: 'nav-manage',
        icon: <FolderRegular />,
        labelKey: 'nav.manage',
        shortcut: undefined,
        section: 'navigation',
        action: navigateTo('manage'),
      },
      {
        id: 'nav-settings',
        icon: <SettingsRegular />,
        labelKey: 'nav.settings',
        shortcut: undefined,
        section: 'navigation',
        action: navigateTo('settings'),
      },

      // Timer
      {
        id: 'timer-start',
        icon: <PlayRegular />,
        labelKey: 'timer.start',
        shortcut: undefined,
        section: 'timer',
        action: () => startTimer(),
      },
      {
        id: 'timer-stop',
        icon: <StopRegular />,
        labelKey: 'timer.stop',
        shortcut: undefined,
        section: 'timer',
        action: () => stopTimer(),
      },
      {
        id: 'timer-toggle',
        icon: <PauseRegular />,
        labelKey: 'commandPalette.toggleTimer',
        shortcut: 'Ctrl+Shift+T',
        section: 'timer',
        action: () => toggleTimer(),
      },

      // Settings
      {
        id: 'theme-light',
        icon: <WeatherSunnyRegular />,
        labelKey: 'settings.themeLight',
        shortcut: undefined,
        section: 'settings',
        action: () => setTheme('light'),
      },
      {
        id: 'theme-dark',
        icon: <WeatherMoonRegular />,
        labelKey: 'settings.themeDark',
        shortcut: undefined,
        section: 'settings',
        action: () => setTheme('dark'),
      },
      {
        id: 'theme-system',
        icon: <DesktopRegular />,
        labelKey: 'settings.themeSystem',
        shortcut: undefined,
        section: 'settings',
        action: () => setTheme('system'),
      },
      {
        id: 'lang-de',
        icon: <LocalLanguageRegular />,
        labelKey: 'commandPalette.langDeutsch',
        shortcut: undefined,
        section: 'settings',
        action: () => setLanguage('de'),
      },
      {
        id: 'lang-en',
        icon: <LocalLanguageRegular />,
        labelKey: 'commandPalette.langEnglish',
        shortcut: undefined,
        section: 'settings',
        action: () => setLanguage('en'),
      },
      {
        id: 'open-settings',
        icon: <SettingsRegular />,
        labelKey: 'commandPalette.openSettings',
        shortcut: 'Ctrl+,',
        section: 'settings',
        action: navigateTo('settings'),
      },
      {
        id: 'new-entry',
        icon: <AddRegular />,
        labelKey: 'commandPalette.newEntry',
        shortcut: 'Ctrl+N',
        section: 'navigation',
        action: navigateTo('entries'),
      },
    ];
  }, [setPage, setTheme, setLanguage, startTimer, stopTimer, toggleTimer]);

  const filteredCommands = useMemo(() => {
    if (!searchText.trim()) return commands;
    const query = searchText.toLowerCase();
    return commands.filter((cmd) => {
      const label = t(cmd.labelKey).toLowerCase();
      return label.includes(query);
    });
  }, [commands, searchText, t]);

  const groupedCommands = useMemo(() => {
    const groups: { section: Command['section']; items: Command[] }[] = [];
    for (const section of sectionOrder) {
      const items = filteredCommands.filter((cmd) => cmd.section === section);
      if (items.length > 0) {
        groups.push({ section, items });
      }
    }
    return groups;
  }, [filteredCommands]);

  const flatFiltered = useMemo(
    () => groupedCommands.flatMap((g) => g.items),
    [groupedCommands],
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchText]);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearchText('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isCommandPaletteOpen]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleCommandPalette]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector('[data-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(flatFiltered.length, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + flatFiltered.length) % Math.max(flatFiltered.length, 1),
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (flatFiltered[selectedIndex]) {
            executeAndClose(flatFiltered[selectedIndex].action);
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [flatFiltered, selectedIndex, executeAndClose, close],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        close();
      }
    },
    [close],
  );

  if (!isCommandPaletteOpen) return null;

  let flatIndex = 0;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} onKeyDown={handleKeyDown}>
      <div className={styles.modal}>
        {/* Search */}
        <div className={styles.searchContainer}>
          <SearchRegular className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder={t('common.search')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Command List */}
        <div className={styles.commandList} ref={listRef}>
          {flatFiltered.length === 0 ? (
            <div className={styles.emptyState}>{t('common.noData')}</div>
          ) : (
            groupedCommands.map((group) => (
              <div key={group.section}>
                <div className={styles.sectionHeader}>{t(sectionLabelKeys[group.section])}</div>
                {group.items.map((cmd) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      className={mergeClasses(
                        styles.commandItem,
                        isSelected && styles.commandItemSelected,
                      )}
                      data-selected={isSelected}
                      onClick={() => executeAndClose(cmd.action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className={styles.commandIcon}>{cmd.icon}</span>
                      <span className={styles.commandLabel}>{t(cmd.labelKey)}</span>
                      {cmd.shortcut && (
                        <Badge
                          className={styles.shortcutBadge}
                          appearance="outline"
                          size="small"
                          color="informative"
                        >
                          {cmd.shortcut}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
