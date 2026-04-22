---
description: "Use when: reviewing DA-Bubble changes for bugs, regressions, architectural drift, responsive issues, or missing tests."
tools:
  - search/codebase
---

# Code Review

Review the requested DA-Bubble change with findings first.

## Focus

- Behavioral regressions
- State ownership and signal/store consistency
- Route and guard side effects
- Firebase contract or security risk
- Responsive dashboard regressions
- Missing or outdated tests

## Output

1. Findings ordered by severity.
2. Open questions or assumptions.
3. Short change summary only after the findings.

If no findings are present, say that clearly and mention residual risk or testing gaps.