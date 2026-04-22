---
name: store-change-workflow
description: "Use when: changing a DA-Bubble signal store, computed state, effect logic, or stateful coordination service"
---

# Store Change Workflow

## Steps

1. Identify the owning store or service.
2. Trace all read and write call sites.
3. List dependent `computed()` and `effect()` chains.
4. Define the minimal state shape change.
5. Update store helpers and consumers together.
6. Add or update focused specs.

## Guardrails

- Do not introduce parallel state containers.
- Keep derived state out of writable state where possible.
- Keep side effects explicit.
- Call out route and UI impact before implementation.
