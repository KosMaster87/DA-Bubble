---
applyTo: "da-bubble/src/**/*.spec.ts"
---

# Testing With Vitest

- DA-Bubble tests run with Vitest through `@angular/build:unit-test`.
- Preferred command: `npx ng test --watch=false`.
- Use `describe`, `it`, `expect`, `beforeEach`, `afterEach`, and `vi` from Vitest.
- Use Angular `TestBed` for DI-based tests.
- Reset testing state in `afterEach()` when the suite configures Angular testing modules.
- Follow Arrange / Act / Assert structure.
- For signal-based services or stores, test derived state synchronously and use explicit effect flushing only when needed.
- When behavior changes, update or add specs before closing the task.
