---
description: "Use when: changing a DA-Bubble store, signal shape, computed value, effect, or stateful service and you want a full impact review first."
tools:
  - search/codebase
---

# Review State Impact

Analyze the requested state change before implementing it.

## Review Questions

1. Which store or service owns the current state?
2. Which components, routes, guards, and services read it?
3. Which write paths mutate it today?
4. Which computed values or effects depend on it?
5. Which tests cover it, and what new tests would be needed?

## Output

Return:

1. Current state ownership.
2. Read and write call sites.
3. Dependent computed/effect chains.
4. Regression risks.
5. Recommended implementation order.
