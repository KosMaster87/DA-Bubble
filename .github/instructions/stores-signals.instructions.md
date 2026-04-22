---
applyTo: "da-bubble/src/app/stores/**/*.ts"
---

# Stores And Signals

- DA-Bubble state uses Angular Signals and `@ngrx/signals` Signal Store.
- Prefer `withState`, `withComputed`, and `withMethods` with focused helper modules for large stores.
- Use `computed()` for derived state only.
- Use `effect()` only for side effects such as synchronization, subscriptions, or persistence.
- Keep `patchState()` writes explicit and localized.
- When changing store state shape, review all dependent components, services, guards, and tests.
- Avoid duplicate derived state in multiple places if one computed source of truth is enough.
- Do not introduce `BehaviorSubject` or parallel state containers for the same concern.
