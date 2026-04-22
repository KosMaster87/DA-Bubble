---
applyTo: "da-bubble/src/app/**/*.ts"
---

# Angular TypeScript Conventions

- DA-Bubble uses Angular 21 standalone components and route-level lazy loading.
- Use standalone APIs only. Do not introduce NgModules, declarations arrays, or module-based bootstrapping patterns.
- Preserve the current folder split between `core`, `features`, `shared`, and `stores`.
- Prefer `inject()` for new dependencies unless the file already follows another stable pattern.
- Prefer explicit return types on exported functions, public methods, guards, helpers, and factory functions.
- Keep public APIs small and intention-revealing.
- Do not introduce `any` in new or changed code. Model unknown data with proper types, unions, or narrow local casts.
- Prefer extracting private helpers instead of letting one component or service grow uncontrolled.
- Keep route-driven behavior aligned with `app.routes.ts` and the dashboard reuse strategy.
