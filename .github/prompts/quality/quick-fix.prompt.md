---
description: "Use when: fixing a focused DA-Bubble bug, TypeScript problem, or local regression with minimal architectural drift."
tools:
  - search/codebase
  - edit/editFiles
---

# Quick Fix

Fix the requested issue with the smallest coherent DA-Bubble change.

## Rules

- Find the root cause before editing.
- Preserve the existing architecture.
- Do not introduce new state systems or fallback abstractions for a local bug.
- If the fix touches Firebase-sensitive paths, call out related rule or contract impact.
- Update tests when behavior changes.

## Output

- Root cause.
- Files changed.
- Tests updated or missing.