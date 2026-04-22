---
name: auth-change
description: "Use when: changing signin, signup, email verification, password reset, avatar selection, onboarding, or guard behavior in DA-Bubble"
---

# Auth Change Workflow

## Steps

1. Trace the user flow from route entry to final state.
2. List the affected pages, guards, stores, and Firebase calls.
3. Identify verified-email, guest, and authenticated-user edge cases.
4. Update UI, state, and guard behavior together.
5. Add or adjust auth-flow tests where practical.

## Guardrails

- Preserve intent of auth-related guards.
- Do not create contradictory onboarding states.
- Keep user messaging consistent with the current flow.
