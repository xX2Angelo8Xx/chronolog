# ChronoLog Documentation

> **Last updated:** March 2026

**Purpose:** Single point of truth for the ChronoLog project — all architecture, decisions, development guides, and changelog in one place.

---

## Overview

**ChronoLog** is a personal time management and tracking tool for Windows. It is built as a desktop application using Electron and React, providing a modern, native-feeling interface for logging work hours, managing projects, setting goals, and analyzing productivity.

---

## Tech Stack

| Layer            | Technology                          | Version |
| ---------------- | ----------------------------------- | ------- |
| Desktop Runtime  | Electron                            | 40      |
| UI Framework     | React                               | 19      |
| Language         | TypeScript                          | 5.7     |
| Bundler          | Vite                                | 6       |
| UI Components    | FluentUI React Components           | 9       |
| State Management | Zustand                             | 5       |
| Database         | better-sqlite3                      | 12      |
| Charts           | ECharts (echarts-for-react)         | 5       |
| i18n             | i18next + react-i18next             | 24 / 15 |
| Testing          | Vitest + Testing Library            | 4       |
| Routing          | react-router-dom                    | 7       |
| Utilities        | date-fns, uuid                      | —       |
| Build / Package  | electron-builder                    | 26      |

---

## Documentation Index

| Document                              | Description                                        |
| ------------------------------------- | -------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)    | System overview, data flow, database schema, stores |
| [DECISIONS.md](DECISIONS.md)          | Architecture Decision Records (ADRs)               |
| [DEVELOPMENT.md](DEVELOPMENT.md)      | Setup, build, test, and contribution guide          |
| [CHANGELOG.md](CHANGELOG.md)          | Version history and release notes                   |

---

## Quick Start

```bash
# 1. Clone and navigate to the project
cd chronolog

# 2. Install dependencies
npm install

# 3. Rebuild native modules for Electron
npx @electron/rebuild

# 4. Start in development mode
npm run electron:dev
```

The app opens at `http://localhost:5173` (Vite dev server) inside an Electron window with hot-reload enabled.

---

## Key Features

- Timer and manual time entry
- Job / Project / Category / Tag management
- User accounts with profile management and password protection
- Dashboard with daily and weekly overview
- Analytics with charts and contribution heatmap
- Goals and gamification (XP, achievements, streaks)
- Pomodoro mode
- Data export/import (`.chronolog` format + CSV)
- German and English localization
- Dark / Light / System theme
- System tray integration with idle detection
- Command palette (`Ctrl+K`)
- Global keyboard shortcuts
