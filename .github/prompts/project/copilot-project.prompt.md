---
description: "Full DA-Bubble project context. Use when: starting a new feature, large refactor, architecture review, or onboarding Copilot to this workspace."
---

# DA-Bubble Project Context

Load and use this context before making larger changes.

## Product

DA-Bubble is a real-time collaboration and chat application with authentication, onboarding, channels, direct messages, threads, mailbox, legal pages, and settings.

## Stack

- Angular 21 standalone app with zoneless change detection
- Angular Router with guard-protected route variants
- Angular Signals plus `@ngrx/signals` Signal Store
- AngularFire with Firebase Auth, Firestore, Storage, and Functions
- SCSS with responsive dashboard behavior
- Vitest via `@angular/build:unit-test`
- PWA with Angular service worker and dual manifests
- Custom signal-based i18n service

## Key Architectural Decisions

- Dashboard routes reuse one main dashboard page component.
- `core/` contains foundational services, guards, and models.
- `features/` contains user-facing pages and feature-scoped UI.
- `shared/` contains reusable components and cross-feature helpers.
- `stores/` contains the main app state and transitions.
- Firebase changes must be reviewed together with rules and affected client contracts.

## Important Paths

- `da-bubble/src/app/app.routes.ts`
- `da-bubble/src/app/app.config.ts`
- `da-bubble/src/app/stores/`
- `da-bubble/src/app/core/`
- `da-bubble/src/app/features/dashboard/`
- `da-bubble/firestore.rules`
- `da-bubble/storage.rules`
- `da-bubble/functions/src/`

## Working Rules

- Prefer minimal changes that match the current architecture.
- Do not add a second i18n system.
- Do not introduce `BehaviorSubject` for app state.
- Preserve responsive dashboard states across desktop, tablet, and mobile.
- For non-trivial changes, identify impacted routes, stores, services, templates, rules, and tests before editing.
- Use `npx ng test --watch=false` when behavior changes.

## Deliverable Expectations

For larger tasks, summarize:

1. Impacted files and layers.
2. Planned implementation order.
3. Risks or regressions to watch.
4. Required tests or manual checks.
