---
name: feature-change-workflow
description: "Use when: implementing a new DA-Bubble feature or extending an existing one across routes, stores, services, templates, and tests"
---

# Feature Change Workflow

Use this workflow for multi-file feature work in DA-Bubble.

## Steps

1. Identify the affected user flow.
2. List impacted routes, stores, services, templates, rules, and tests.
3. Confirm required states: loading, empty, error, disabled, desktop, mobile.
4. Prefer spec-first for non-trivial behavior.
5. Implement in small, architecture-aligned slices.
6. Run or update tests.
7. Summarize regressions checked and any remaining gaps.

## Guardrails

- Reuse the existing dashboard route model.
- Keep state in signals or signal stores.
- Do not add a second translation system.
- If data shape changes, review Firebase impact explicitly.
