# Architecture Decision Records

> **Last updated:** March 2026

**Purpose:** Record significant architecture and technology decisions for ChronoLog, including context, rationale, and consequences.

---

## Index

| ADR   | Title                                          | Status   |
| ----- | ---------------------------------------------- | -------- |
| 001   | Electron + React for desktop app               | Accepted |
| 002   | FluentUI React Components for UI library       | Accepted |
| 003   | better-sqlite3 for database                    | Accepted |
| 004   | Zustand for state management                   | Accepted |
| 005   | i18next for internationalization               | Accepted |
| 006   | Frameless window with custom titlebar          | Accepted |
| 007   | Single-instance lock                           | Accepted |
| 008   | Employer → Job terminology rename              | Accepted |

---

## ADR-001: Electron + React for Desktop App

**Date:** March 2026  
**Status:** Accepted

### Context

ChronoLog needs to be a desktop application for Windows with access to system-level features (tray, idle detection, global shortcuts, file system). The team has strong web technology expertise.

### Decision

Use **Electron** as the desktop runtime and **React** as the UI framework, bundled with **Vite** and **vite-plugin-electron**.

### Rationale

- Full access to Node.js APIs for system integration (tray, notifications, global shortcuts, idle detection).
- React provides a mature, component-based UI model with a large ecosystem.
- Vite gives fast HMR during development and optimized production builds.
- Cross-platform potential in the future (macOS, Linux) without a rewrite.
- Team familiarity with web technologies reduces ramp-up time.

### Consequences

- Larger application bundle size compared to a native app.
- Higher memory baseline (~100–200 MB) typical for Electron apps.
- Chromium updates are tied to Electron release cadence.

---

## ADR-002: FluentUI React Components for UI Library

**Date:** March 2026  
**Status:** Accepted

### Context

The app targets Windows users. The UI should feel native and polished without building every component from scratch.

### Decision

Use **@fluentui/react-components** (Fluent UI v9) and **@fluentui/react-icons** for all UI elements.

### Rationale

- Native Windows 11 look and feel out of the box.
- Comprehensive component library (buttons, inputs, dialogs, menus, etc.).
- Built-in accessibility (ARIA, keyboard navigation, high contrast).
- First-class dark/light theme support via `FluentProvider`.
- Maintained by Microsoft with long-term support.

### Consequences

- Styling customization requires understanding Fluent's token system.
- Bundle includes components that may not all be used.
- Tightly couples UI appearance to the Windows design language.

---

## ADR-003: better-sqlite3 for Database

**Date:** March 2026  
**Status:** Accepted

### Context

The app needs persistent, structured data storage for time entries, projects, goals, settings, and more. Data stays local on the user's machine.

### Decision

Use **better-sqlite3** as an embedded SQLite database running synchronously in the Electron main process.

### Rationale

- Synchronous API simplifies main-process database logic — no callback/promise nesting.
- Excellent read/write performance for local data sizes.
- No external database server required — zero configuration for users.
- WAL journal mode enables concurrent reads without blocking.
- SQL provides powerful querying for analytics and reporting.
- Single-file database is easy to back up and portable.

### Consequences

- Native module requires `@electron/rebuild` after install.
- Synchronous operations block the main process — mitigated by fast SQLite queries.
- Schema changes need migration management (implemented via versioned migrations).

---

## ADR-004: Zustand for State Management

**Date:** March 2026  
**Status:** Accepted

### Context

The renderer needs to manage global state for navigation, settings, timer, and CRUD data. Redux was considered but deemed heavyweight for this use case.

### Decision

Use **Zustand** with three focused stores: `appStore`, `dataStore`, `timerStore`.

### Rationale

- Minimal API surface — `create()` + hooks, no boilerplate (actions, reducers, dispatchers).
- TypeScript-first design with excellent type inference.
- Small bundle size (~1 KB gzipped).
- Stores can call async functions directly (IPC calls to main process).
- Selective subscriptions prevent unnecessary re-renders.
- No context providers needed — stores are importable anywhere.

### Consequences

- No built-in devtools (can be added via middleware if needed).
- Multiple stores require manual coordination for cross-store logic.

---

## ADR-005: i18next for Internationalization

**Date:** March 2026  
**Status:** Accepted

### Context

The app needs to support German (primary) and English, with the option to add more languages later.

### Decision

Use **i18next** with **react-i18next** for translations. Locale files are flat JSON files in `src/i18n/`.

### Rationale

- Industry-standard i18n library with mature ecosystem.
- React integration via `useTranslation()` hook is simple and performant.
- Supports interpolation, pluralization, and nested keys.
- Adding a new language is as easy as creating a JSON file and registering it.
- Fallback language support ensures missing keys don't break the UI.

### Consequences

- All user-facing strings must be extracted to JSON files.
- Translation keys need to be kept in sync across locale files.

---

## ADR-006: Frameless Window with Custom Titlebar

**Date:** March 2026  
**Status:** Accepted

### Context

The default Electron titlebar looks generic. A custom titlebar allows branding, integrated navigation, and a more polished user experience.

### Decision

Use `frame: false` with `titleBarOverlay` to create a frameless window that retains native Windows caption buttons (minimize, maximize, close) while allowing custom content in the titlebar area.

### Rationale

- Modern, branded appearance aligned with Windows 11 design.
- Titlebar area can include app title, navigation breadcrumbs, or status indicators.
- `titleBarOverlay` preserves native window controls — no need to reimplement drag, snap, or accessibility.
- Transparent overlay blends seamlessly with both dark and light themes.

### Consequences

- Requires `-webkit-app-region: drag` CSS for draggable areas.
- Interactive elements in the titlebar need `-webkit-app-region: no-drag`.
- Window behavior testing needed across different Windows versions and DPI scaling.

---

## ADR-007: Single-Instance Lock

**Date:** March 2026  
**Status:** Accepted

### Context

SQLite does not support concurrent write access from multiple processes. Running two instances of ChronoLog could corrupt the database or cause confusing timer behavior.

### Decision

Use `app.requestSingleInstanceLock()` to ensure only one instance of ChronoLog runs. The second instance focuses the existing window instead of opening a new one.

### Rationale

- Prevents database corruption from concurrent write access.
- Avoids user confusion from duplicate timers or conflicting state.
- Standard pattern for desktop productivity apps.

### Consequences

- Users cannot run multiple isolated instances (not a use case for this app).
- The `second-instance` event handler must correctly restore and focus the existing window.

---

## ADR-008: Employer → Job Terminology Rename

**Date:** March 2026  
**Status:** Accepted

### Context

The original data model used "Employer" (German: "Arbeitgeber") as the top-level organizational entity for time entries. In practice, users track time across different work contexts that are not always traditional employers — freelance gigs, side projects, volunteer work, and personal tasks also need tracking.

### Decision

Rename "Employer" / "Arbeitgeber" to **"Job" / "Arbeit"** across the entire application: i18n translation files, database migration comments, documentation, and all UI-facing text.

### Rationale

- "Job" is a broader, more intuitive term that encompasses employment, freelance work, and other work contexts.
- "Arbeit" is the natural German equivalent and reads more naturally than "Arbeitgeber" in a time-tracking context.
- The rename was done early (pre-release) so no data migration of stored values was required — only labels and comments changed.

### Consequences

- All documentation, translation keys, and UI text now use "Job" / "Arbeit" consistently.
- Database column names were already generic (`job_id`, `jobs` table) and did not require migration.
- Future features should use "Job" terminology when referring to the top-level work context.

---

## Template for Future ADRs

```markdown
## ADR-XXX: [Title]

**Date:** [Month Year]
**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

### Context

[What is the issue or requirement that motivates this decision?]

### Decision

[What is the change or choice being made?]

### Rationale

- [Why this approach over alternatives?]

### Consequences

- [What are the trade-offs, risks, or follow-up work?]
```
