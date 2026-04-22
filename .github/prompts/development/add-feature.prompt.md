---
description: "Use when: adding a DA-Bubble feature or expanding an existing flow across UI, routes, stores, or Firebase-backed data."
tools:
  - search/codebase
  - edit/editFiles
---

# Add Feature

Implement the requested DA-Bubble feature with the current architecture instead of inventing a parallel system.

## Before Editing

1. Identify the affected routes, stores, services, templates, rules, and tests.
2. State whether the feature touches auth, channels, direct messages, threads, mailbox, legal pages, or settings.
3. Name the user-facing states that must exist: loading, empty, error, disabled, mobile, desktop.

## Implementation Rules

- Keep state in signals or signal stores.
- Reuse the dashboard route and panel model where possible.
- Keep copy aligned with the current i18n approach.
- If the feature changes data shape, mention Firebase rule or function impact explicitly.
- Prefer TDD first for non-trivial behavior.

## Output

- Short implementation plan.
- Files to add or change.
- Tests to add or update.
- Any required manual verification.
