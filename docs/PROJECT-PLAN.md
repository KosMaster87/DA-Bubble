# Project Plan — DA-Bubble Chat Application

**Status:** Active Development
**Stack:** Angular 21 + Firebase + Signals
**Goal:** Real-time chat with Channels, DMs, Threads, and Mailbox

---

## Overview

DA-Bubble is a modern Discord-like chat application with the following core features:

- ✅ Authentication (Email/Password + Google OAuth)
- ✅ Channels and Direct Messages
- ✅ Threads and Reactions
- ✅ Mailbox for invitations and notifications
- ✅ Responsive Dashboard (Desktop/Tablet/Mobile)
- 🔜 Online Status and Presence
- 🔜 Message Search

---

## Phase 1 — Core Features (Current)

**In Progress:**

- [x] GitHub repo and workspace set up
- [x] Angular 21 Standalone setup with Signals
- [x] Firebase Authentication (Email + Google Popup)
- [x] Firestore data model and Security Rules
- [x] Core features: Auth, Channels, DMs, Threads implemented
- [x] Responsive Dashboard for Desktop/Tablet/Mobile
- [x] i18n Service (custom Signal-based)
- [x] ESLint + Prettier configured
- [x] Vitest test coverage
- [ ] Mailbox: all flows fully wired
- [ ] Session/Error Notifications: centralized
- [ ] Online Status/Heartbeat: Firestore Rules adjusted
- [ ] Presence Tracking: live indicators

**Related Files:**

- `.github/copilot-instructions.md` — project rules
- `.github/instructions/` — scoped coding standards
- `da-bubble/README.md` — feature overview

---

## Phase A — Stabilization & Documentation (Q2 2026)

**Scope:**

- Mailbox UI fully wired (static → dynamic rendering)
- Session/Error Notifications centralized
- Firestore Heartbeat Rules fixed
- Unread logic documented
- Regression tests for responsive behavior

**Tech Debt Tracking:**

See [TECH-DEBT.md](../TECH-DEBT.md) and [tech-dept.md](../tech-dept.md)

---

## Phase B — Extended Features (Q3 2026)

**Scope:**

- User Presence / Online Status (green indicator)
- Message Search (Channels + DMs + Threads)
- Draft Messages (local persistence)
- Reaction Picker ergonomics
- Typing Indicators

---

## Phase C — Performance & Hosting (Q4 2026)

**Scope:**

- Lazy loading for large message feeds
- Firestore query optimization
- Firebase indexes validation
- PWA installability
- IONOS production deployment

---

## Development Workflow

```
main (production)
  └── develop
        └── feature/<scope>     ← feature branches
        └── fix/<scope>
        └── docs/<scope>
```

**Branch Convention (Conventional Commits):**

- `feature/mailbox-dynamic-rendering`
- `fix/heartbeat-firestore-rules`
- `docs/unread-reload-logic`
- `refactor/store-cleanup`

**PR Standard:**

- Title: `type(scope): description` — max. 72 chars
- Description: context, testing, risks, affected paths
- At least 1 approval before merge
- Vitest must pass with `--watch=false`

---

## Architecture Overview

| Area                 | Decision                        | Rationale                        |
| -------------------- | ------------------------------- | -------------------------------- |
| Frontend Framework   | Angular 21 Standalone           | Signals, Zoneless, Clean Routing |
| State Management     | @ngrx/signals Signal Store      | Reactive, Testable, Explicit     |
| Database             | Firebase Firestore              | Realtime, No Ops, Security Rules |
| Styling              | SCSS + BEM                      | Responsive, Maintainable         |
| Testing              | Vitest                          | Fast, Angular-friendly           |
| Internationalization | Custom Signal-based i18nService | Lightweight, No i18n Bloat       |
| PWA                  | Angular Service Worker          | Offline, Fast, Installable       |
| Hosting              | IONOS Apache (.htaccess SPA)    | Production Stable, Affordable    |
