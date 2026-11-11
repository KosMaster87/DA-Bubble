# DA-Bubble — Workspace Instructions

Angular 21.2 chat workspace for DA-Bubble.

## Product Context

- DA-Bubble is a real-time collaboration/chat application, not a marketing or portfolio site.
- Main flows are authentication, onboarding, dashboard navigation, channels, direct messages, threads, mailbox, legal pages, and settings.
- The dashboard is route-driven and reuses one main dashboard page component across route variants.

## Stack Decisions

- Framework: Angular 21 standalone application with zoneless change detection.
- Routing: Angular Router with guards and dashboard route variants defined in `da-bubble/src/app/app.routes.ts`.
- State: Angular Signals plus `@ngrx/signals` Signal Store. Prefer `signal()`, `computed()`, `effect()`, `signalStore()`, `patchState()`.
- Firebase: AngularFire for Auth, Firestore, Storage, plus Cloud Functions in `da-bubble/functions/`.
- PWA: Angular service worker, dual manifests, standalone display handling, responsive mobile layout.
- i18n: existing custom signal-based `I18nService` in `da-bubble/src/app/core/services/i18n/`. Do not introduce a second translation system unless explicitly requested.
- Styling: SCSS, shared style partials, responsive dashboard behavior, mobile-first fixes where possible.
- Testing: Vitest via `@angular/build:unit-test`. Use `npx ng test --watch=false`.

## Architecture Rules

- Keep `core/` for domain models, guards, app-wide singleton services, and foundational infrastructure.
- Keep `features/` for user-facing feature pages and feature-specific components.
- Keep `shared/` for reusable UI components and cross-feature presentation helpers.
- Keep `stores/` as the source of truth for app state and state transitions.
- Prefer extracting helpers next to large stores or services instead of growing one file indefinitely.
- Preserve the existing route structure and dashboard reuse strategy unless the task explicitly requires changing navigation architecture.

## Coding Rules

- Follow the existing standalone-component approach. Do not reintroduce NgModules.
- Prefer `inject()` over constructor injection when adding new dependencies, unless the local file already follows a different established pattern.
- Prefer explicit return types on exported functions and public methods.
- Add concise JSDoc to public methods and non-obvious exported helpers. Include `@description` on every function to document _why_ it exists and what its role is — not just what it does.
- Avoid `any`. If a temporary escape hatch is unavoidable, keep it local and document why.
- Keep changes minimal and consistent with the current folder conventions and naming.

## State Rules

- Do not introduce `BehaviorSubject` or ad-hoc observable state containers for component or app state.
- Use `computed()` for derived state and `effect()` only for side effects.
- Keep store write paths explicit. Avoid hidden mutations and duplicated derived state.
- When changing state shape, audit dependent routes, services, templates, and tests.

## Firebase And Security Rules

- Any change touching Auth, Firestore, Storage, rules, or Functions must preserve security assumptions first.
- Do not weaken `firestore.rules` or `storage.rules` for convenience.
- If a client-side data contract changes, review rules, indexes, functions, and affected stores/services together.
- Prefer fixing authorization or data-shape issues at the root cause instead of patching UI symptoms.

## UI And UX Rules

- Dashboard changes must be checked for desktop, tablet, and mobile panel behavior.
- Preserve loading, empty, error, offline, and disabled states.
- Keep templates accessible: semantic structure, proper button usage, labels, keyboard reachability, and translatable user-facing text.

## Workflow Rules

- TDD first for non-trivial behavior changes: spec before implementation where practical.
- For multi-file work, first identify impacted routes, stores, services, templates, rules, and tests.
- Conventional commits only: `type(scope): message`, imperative mood, no emojis, max 72 chars.
- Use `/copilot-project` for the complete DA-Bubble project context before larger tasks.

## Branch And Release Rules

The GitHub rulesets on `dev`, `staging` and `main` enforce these rules. Follow them even if your account could bypass them.

- Branch flow: `feature/*` or `fix/*` from `dev` → PR into `dev` → release PR `dev` → `staging` → release PR `staging` → `main`.
- Never push directly to `dev`, `staging` or `main`. Every change goes through a pull request with a green `quality` check.
- Never force-push or delete `dev`, `staging` or `main`.
- `dev` keeps a linear history: merge feature PRs with "Squash and merge" or "Rebase and merge".
- Release PRs into `staging` and `main` use "Create a merge commit". The merge commit documents when a release happened. It is expected that `staging` and `main` show as "ahead of dev"; do not back-merge into `dev` to align the counters.
- A push to `staging` deploys staging, a push to `main` deploys production (`.github/workflows/deploy.yml`). Merge into `main` only after staging has been checked.
- Renovate PRs target `dev` and follow the same rules. Close updates whose CI fails instead of forcing them.

### Collaborator and admin

- Collaborators (write role) work only through pull requests as described above.
- The repository admin may bypass the rulesets, but only when a pull request cannot solve the problem (for example a broken pipeline or a blocked emergency fix). A bypass must be named in the PR or commit description, and any hotfix on `main` must be brought back afterwards: into `staging` by merge commit, into `dev` by cherry-pick through a PR (because `dev` keeps a linear history).
