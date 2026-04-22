---
description: "Use when: treating a DA-Bubble area as legacy code and producing a read-only modernization audit with prioritized next steps."
tools:
  - search/codebase
  - execute/runInTerminal
  - execute/getTerminalOutput
---

# Audit Legacy

Run a read-only legacy audit for DA-Bubble. Do not edit files in this workflow.

## Goal

Create a prioritized technical-debt report that can guide later, incremental improvements.

## Scope Rules

- Stay read-only.
- No refactor or implementation changes.
- No Firebase rules or security model changes.
- Focus on understanding risk before proposing action.

## Phase 0: Load Context

1. Load [project/copilot-project.prompt.md](./copilot-project.prompt.md).
2. Read [.github/AGENTS.md](../../AGENTS.md).
3. Confirm requested scope path from `$input`.

If `$input` is missing, ask for one target path or module.

## Phase 1: Overview

For the target scope, summarize:

- What this area does in user terms.
- Primary entry points and dependencies.
- Build/runtime touchpoints (routes, stores, services, Firebase integration).

## Phase 2: Architecture Map

Map the internal flow:

- Main modules/files and responsibilities.
- Data flow: inputs, state transitions, outputs.
- Sensitive boundaries (auth, rules assumptions, async effects, persistence).

## Phase 3: Legacy Debt Audit

Find and explain candidates for modernization:

- Oversized or high-complexity files/functions.
- Missing or weak test coverage.
- Duplicated or inconsistent patterns.
- Dead or likely-unused paths.
- Potential regression hotspots.

For each finding, include:

1. What the issue is.
2. Why it is risky.
3. Where it is (file references).
4. Smallest safe next step.

## Phase 4: Prioritize

Produce top 5 actions ranked by:

1. Risk reduction
2. User impact
3. Migration effort

Prefer low-risk, high-value steps first. No big-bang rewrite.

## Output Format

Return exactly these sections:

1. Overview
2. Architecture Map
3. Debt Findings
4. Top 5 Priorities
5. Suggested Next Minimal Step

## Optional Terminal Checks (read-only)

When useful, run read-only commands to support findings, for example:

- `rg --files <scope>` for file inventory
- `rg "describe\\(|it\\(" da-bubble/src` for test presence hints
- `npx ng test --watch=false --include=<spec-path>` only if explicitly requested

Do not run write or destructive commands.
