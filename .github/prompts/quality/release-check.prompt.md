---
description: "Use when: running a final DA-Bubble quality pass before merge, release, or deployment."
tools:
  - search/codebase
---

# Release Check

Run a DA-Bubble-oriented release readiness review.

## Check

1. Routes and guards.
2. Stores and signal side effects.
3. Firebase contract and security assumptions.
4. Dashboard responsive behavior.
5. Loading, empty, error, and disabled states.
6. Tests run and testing gaps.

## Output

Return:

1. Blocking issues.
2. Important non-blocking risks.
3. Manual verification checklist.
4. Release confidence summary.