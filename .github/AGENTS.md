# DA-Bubble Agent Playbook

Use this file as the shared working agreement for Copilot custom agents in this workspace.

## Core Principle

Use agents to isolate complex DA-Bubble tasks, not to avoid thinking.

## Recommended Flow

1. Load `/copilot-project` for full workspace context.
2. For multi-file work, identify the impacted routes, stores, services, templates, rules, and tests first.
3. Choose the narrowest matching agent.
4. Implement in small slices.
5. Run or update tests before closing the task.

## When To Work Directly

- Single-file fixes.
- Small template or styling adjustments.
- Tiny wording or translation changes.
- Security-sensitive changes where every step should stay explicit.

## When To Use Agents

- Changes touching more than three files.
- Refactors across stores, services, and templates.
- Route or dashboard behavior changes.
- Auth, Firebase, or data-contract reviews.
- Pre-merge regression or release readiness reviews.

## Agent Selection

- Use `da-bubble-architect` for multi-file feature planning and architectural impact.
- Use `signals-store-refactor` for store shape changes, computed/effect cleanup, and signal consistency.
- Use `firebase-safety-reviewer` before or during Auth, Firestore, Storage, Rules, or Functions changes.
- Use `auth-flow-agent` for signin, signup, verify-email, password reset, onboarding, avatar selection, and guard interactions.
- Use `dashboard-flow-agent` for dashboard routing, panel visibility, thread state, responsive layout, and deep-link behavior.
- Use `ui-regression-agent` when a change affects loading, empty, error, accessibility, or responsive UI states.
- Use `test-author-agent` when specs are missing or behavior is changing.
- Use `release-readiness-agent` before merge or deployment.

## High-Risk Areas

- `da-bubble/firestore.rules`
- `da-bubble/storage.rules`
- `da-bubble/functions/src/`
- `da-bubble/src/app/stores/auth/`
- `da-bubble/src/app/core/guards/`
- `da-bubble/src/app/core/services/`

For these areas, prefer review-first and keep security assumptions explicit.

## Definition Of Done

- Behavior is correct across the affected routes and views.
- State transitions remain consistent.
- User-facing text remains aligned with the current i18n approach.
- Tests were added or updated where behavior changed.
- No instruction or agent suggested a different architecture than the one already used by DA-Bubble.

## Governance

- New instructions, prompts, agents, and skills must follow the naming schema in `governance/naming-schema.md`.
- Before adding a new customization, check whether an existing one can be extended instead.
- Prefer one clear responsibility per customization file.
- Keep `description` fields specific and discoverable using `Use when:` wording.
