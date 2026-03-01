# Development Guide

> **Last updated:** March 2026

**Purpose:** Everything a developer needs to set up, run, build, test, and extend ChronoLog.

---

## Prerequisites

| Requirement | Version | Notes                                      |
| ----------- | ------- | ------------------------------------------ |
| Node.js     | 20+     | LTS recommended                            |
| npm         | 10+     | Comes with Node.js                         |
| Windows     | 10/11   | Primary target platform                    |
| Git         | 2.x     | For version control                        |

> **Note:** `better-sqlite3` is a native C++ module. On Windows, the build tools are usually bundled. If you encounter native module errors, install the [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload.

---

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd chronolog

# 2. Install dependencies
npm install

# 3. Rebuild native modules for Electron's Node.js version
npx @electron/rebuild
```

---

## Development

```bash
# Start the Vite dev server + Electron in parallel
npm run electron:dev
```

This runs:
- **Vite** dev server on `http://localhost:5173` with hot module replacement.
- **Electron** loads the dev server URL once it's ready (via `wait-on`).
- DevTools open automatically in development mode.

### Other dev commands

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Vite dev server only (no Electron)   |
| `npm run typecheck`  | TypeScript type checking (`tsc --noEmit`) |

---

## Build

```bash
# Compile TypeScript, bundle with Vite, package with electron-builder
npm run build
```

Output:
- `dist/` — Bundled renderer (Vite output)
- `dist-electron/` — Compiled main process + preload
- `release/` — Packaged Electron app (`.exe` installer, unpacked directory)

Build configuration is in `electron-builder.yml`.

---

## Testing

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

- Test framework: **Vitest** with **jsdom** environment.
- Assertions: **@testing-library/jest-dom** matchers.
- Component testing: **@testing-library/react**.
- User interactions: **@testing-library/user-event**.
- Test files live in `src/__tests__/` or alongside components as `*.test.ts(x)`.
- Setup file: `src/__tests__/setup.ts`.
- **139 tests** total: i18n (5), dataStore (63), userStore (22), timerStore (29), appStore (20).

---

## Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full directory tree and data flow. Key concepts:

| Concept         | Location                        | Description                                     |
| --------------- | ------------------------------- | ----------------------------------------------- |
| Main process    | `electron/`                     | App lifecycle, DB, IPC, tray, idle detection     |
| Preload bridge  | `electron/preload.ts`           | Secure API exposed to renderer via `contextBridge` |
| Renderer        | `src/`                          | React app, components, stores, services          |
| Database        | `electron/database/`            | Schema, migrations, connection management        |
| Translations    | `src/i18n/`                     | i18next JSON files (de, en)                      |
| Types           | `src/types/index.ts`            | Shared TypeScript interfaces                     |

---

## How-To Guides

### Add a New Translation

1. Create a new JSON file in `src/i18n/`, e.g. `fr.json`, following the same key structure as `de.json` and `en.json`.
2. Register it in `src/i18n/index.ts`:
   ```typescript
   import fr from './fr.json';

   i18n.use(initReactI18next).init({
     resources: {
       de: { translation: de },
       en: { translation: en },
       fr: { translation: fr },  // ← add here
     },
     // ...
   });
   ```
3. Add UI for selecting the new language in the Settings page if not already dynamic.

### Add a New Page / Component

1. Create a folder under `src/components/` named after the feature (e.g. `Reports/`).
2. Create the page component (e.g. `ReportsPage.tsx`).
3. Add the page to the `NavPage` type in `src/types/index.ts`:
   ```typescript
   export type NavPage = 'dashboard' | 'timer' | ... | 'reports';
   ```
4. Add navigation in the sidebar (`src/components/Layout/`) and render logic in `AppLayout`.
5. Add translations for the page title and any UI strings to `de.json` and `en.json`.

### Add a Database Migration

1. Open `electron/database/migrations.ts`.
2. Add a new entry to the `MIGRATIONS` array with the next `version` number:
   ```typescript
   {
     version: 2,
     description: 'Add reports table',
     sql: `
       CREATE TABLE IF NOT EXISTS reports (
         id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       );
     `,
   },
   ```
3. The migration runs automatically on next app startup. The `migrations` table tracks which versions have been applied.
4. **Never modify an existing migration** — always create a new one.

### Add a New Zustand Store

1. Create a file in `src/stores/`, e.g. `reportsStore.ts`.
2. Define the state interface and create the store:
   ```typescript
   import { create } from 'zustand';

   interface ReportsState {
     reports: Report[];
     loadReports: () => Promise<void>;
   }

   export const useReportsStore = create<ReportsState>((set) => ({
     reports: [],
     loadReports: async () => {
       const data = await dbService.getReports();
       set({ reports: data });
     },
   }));
   ```
3. Use the store in components via `const { reports } = useReportsStore();`.

---

## Environment & Configuration

### Vite Configuration

- Config file: `vite.config.ts`
- Plugins: `@vitejs/plugin-react`, `vite-plugin-electron`, `vite-plugin-electron-renderer`
- Path alias: `@/` → `src/`

### TypeScript Configuration

- `tsconfig.json` — renderer (includes path aliases, JSX)
- `tsconfig.node.json` — main process / Vite config

### Electron Builder

- Config file: `electron-builder.yml`
- Targets: Windows (NSIS installer + unpacked)
- App icon: `assets/icon.png` (auto-converted by `scripts/generate-icons.js`)

### Database Location

- Development & production: `{app.getPath('userData')}/chronolog.db`
- On Windows: typically `C:\Users\<user>\AppData\Roaming\chronolog\chronolog.db`

### Global Shortcuts

| Shortcut              | Action                          |
| --------------------- | ------------------------------- |
| `Ctrl+Shift+T`        | Toggle timer                    |
| `Ctrl+Shift+L`        | Show/hide window                |
| `Ctrl+K`              | Open command palette (in-app)   |
