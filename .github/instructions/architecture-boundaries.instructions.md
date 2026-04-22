---
applyTo: "da-bubble/src/app/**/*.ts"
---

# Architecture Boundaries

- `core/` holds foundational services, guards, models, and infrastructure.
- `features/` holds feature pages and feature-scoped components.
- `shared/` holds reusable presentation components and cross-feature UI helpers.
- `stores/` holds app state, write methods, derived state, and store helper modules.
- Do not move stateful business logic into templates.
- Do not let feature components reach into unrelated feature internals when a shared or core abstraction is more appropriate.
- When a change spans stores, services, routes, and UI, keep each responsibility in its existing layer instead of centralizing everything in one file.
