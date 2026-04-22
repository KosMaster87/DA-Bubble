# Tech Stack — DA-Bubble Chat Application

## Confirmed Stack Decisions

| Area               | Decision                         | Status  |
| ------------------ | -------------------------------- | ------- |
| Frontend Framework | Angular 21 Standalone            | ✅ Live |
| State Management   | @ngrx/signals Signal Store       | ✅ Live |
| Database           | Firebase Firestore + Storage     | ✅ Live |
| Authentication     | Firebase Auth (Email + Google)   | ✅ Live |
| Routing            | Angular Router (Guard-Protected) | ✅ Live |
| Styling            | SCSS (BEM Methodology)           | ✅ Live |
| Testing            | Vitest via @angular/build        | ✅ Live |
| Linting            | ESLint + Prettier                | ✅ Live |
| i18n               | Custom Signal-based Service      | ✅ Live |
| PWA                | Angular Service Worker           | ✅ Live |
| Change Detection   | Zoneless (Signal-driven)         | ✅ Live |
| Hosting            | IONOS Apache (Production)        | ✅ Live |

---

## Frontend: Angular 21 + Signals

**Rationale:** Modern, enterprise-ready, Signals for efficient reactivity without zones.
Standalone Components enable component-based modularity without NgModules.

**Implications:**

- Signal-driven change detection (Zoneless)
- Lazy loading at route level
- Standalone components + dependencies via `inject()`

---

## State Management: @ngrx/signals Signal Store

**Rationale:** Explicit, reactive, optimized for the Signals ecosystem.
Away from RxJS-observable complexity while keeping full control over state transitions.

**Structure:**

```
stores/
├── auth/              # modular for complex features
│   ├── auth.store.ts
│   ├── auth.types.ts
│   └── auth.*.methods.ts
├── channel.store.ts
├── direct-message.store.ts
├── thread.store.ts
└── ...
```

**Implications:**

- `withState()`, `withComputed()`, `withMethods()`
- `patchState()` for explicit updates
- `computed()` for derived state
- `effect()` only for side effects

---

## Firebase Firestore

**Rationale:** NoSQL, Realtime, Security Rules, no infrastructure costs.
Global replication, offline support via AngularFire.

**Implications:**

- Document-centric data model
- Security Rules as the authorization layer
- Indexes for complex queries
- Cloud Functions optional for backend logic

---

## Styling: SCSS + BEM

**Rationale:** Maintainable, scalable, responsive-first for Mobile/Tablet/Desktop.
Shared mixins and variables via `styles/` partials.

**Implications:**

- Components have `.component.scss`
- Global styles in `src/styles/`
- BEM convention for class names
- Breakpoint mixins for responsiveness

---

## Project Structure

```
da-bubble/
├── src/
│   ├── app/
│   │   ├── core/                 # Singleton Services, Guards, Models
│   │   │   ├── guards/           # Route Guards
│   │   │   ├── models/           # Domain Models (User, Channel, Message, etc.)
│   │   │   └── services/         # Firebase Wrappers, Unread Tracking, etc.
│   │   ├── features/             # Feature Pages
│   │   │   ├── auth/
│   │   │   ├── dashboard/        # Main Chat UI
│   │   │   └── legal/
│   │   ├── shared/               # Reusable Components
│   │   │   ├── components/
│   │   │   ├── dashboard-components/
│   │   │   └── animations/
│   │   ├── stores/               # @ngrx/signals Signal Store
│   │   │   ├── auth/
│   │   │   ├── channel.store.ts
│   │   │   ├── direct-message.store.ts
│   │   │   ├── thread.store.ts
│   │   │   └── ...
│   │   ├── app.routes.ts         # Main Router Config
│   │   └── app.config.ts
│   ├── styles/                   # Global SCSS (Variables, Mixins)
│   └── main.ts
├── .github/
│   ├── copilot-instructions.md   # Project-Wide Rules
│   ├── AGENTS.md
│   ├── instructions/             # Scoped Coding Standards
│   ├── prompts/                  # Repeatable Workflows
│   ├── skills/                   # Multi-Step Playbooks
│   └── governance/
├── firestore.rules               # Security Rules
├── firestore.indexes.json        # Composite Indexes
├── storage.rules                 # File Upload Rules
├── angular.json
├── package.json
└── README.md
```

---

## Roadmap

| Phase | Focus                        | Timeline | Status |
| ----- | ---------------------------- | -------- | ------ |
| A     | Stabilization & Tech Debt    | Q2 2026  | 🔄     |
| B     | Presence, Search, Drafts     | Q3 2026  | 📋     |
| C     | Performance & Deployment     | Q4 2026  | 📋     |
