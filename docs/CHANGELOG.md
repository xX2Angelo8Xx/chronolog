# Changelog

> **Last updated:** March 2026

**Purpose:** Track all notable changes to ChronoLog. Follows [Keep a Changelog](https://keepachangelog.com/) conventions.

---

## [1.0.0] — March 2026

Initial release of ChronoLog — Personal Time Management & Tracking Tool for Windows.

### Added

- **Time Tracking**
  - Timer with start, stop, and break support (coffee/lunch breaks)
  - Manual time entry creation and editing
  - Running entry persists across app restarts

- **Organization**
  - Job management with colors and hourly rates
  - Project management scoped to jobs (with favorites and archiving)
  - Category system for work type classification
  - Free-form tag system with many-to-many entry tagging

- **Dashboard**
  - Daily overview with total hours, breaks, and entry count
  - Weekly summary view
  - Quick-access timer controls

- **Analytics**
  - Charts powered by ECharts (bar, pie, line)
  - Contribution heatmap for activity visualization
  - Breakdowns by job, project, and category
  - Customizable date ranges

- **Goals & Gamification**
  - Daily, weekly, and monthly hour targets (optionally scoped to job/project)
  - XP system with levels
  - Achievement badges (first entry, hour milestones, streaks, deep focus, etc.)
  - Streak tracking (current and longest)

- **Pomodoro Mode**
  - Configurable work and break durations (default: 25/5 minutes)

- **Data Portability**
  - Export to `.chronolog` format (full data backup as JSON)
  - Import from `.chronolog` format (replace or merge modes)
  - Export to CSV for spreadsheet compatibility

- **Localization**
  - German (default) and English
  - Full UI translation via i18next

- **Theming**
  - Dark, Light, and System-follow themes
  - Powered by FluentUI design tokens

- **System Integration**
  - System tray with timer status tooltip
  - Minimize to tray on close
  - Idle detection (auto-pause suggestions)
  - Desktop notifications
  - Global shortcuts (`Ctrl+Shift+T` toggle timer, `Ctrl+Shift+L` show/hide)
  - Single-instance enforcement

- **UI & UX**
  - Frameless window with native Windows caption buttons
  - Splash screen during startup
  - Command palette (`Ctrl+K`) for quick navigation and actions
  - Collapsible sidebar navigation
  - Compact mode option

- **User Accounts & Profiles**
  - User profile display in sidebar (avatar, name, logout button)
  - Profile management section in Settings (avatar, name, change password, logout)
  - Password change dialog in Settings
  - `user_id` integration in timer flow (timerStore reads currentUser, passes user_id to createTimeEntry)
  - New i18n keys: auth.logout, auth.changePassword, auth.currentPassword, auth.newPassword, auth.passwordChanged, auth.deleteProfile, auth.confirmDeleteProfile

- **Developer Experience**
  - Vite-powered HMR for fast development
  - Vitest test suite with Testing Library (139 tests)
  - Versioned database migrations
  - Audit logging for data changes

### Changed

- **Terminology**: Renamed "Employer" / "Arbeitgeber" to "Job" / "Arbeit" across the entire app (i18n files, database migration comments, documentation)

### Tests

- 71 additional store tests across userStore (22), timerStore (29), and appStore (20), bringing total from 68 to 139
