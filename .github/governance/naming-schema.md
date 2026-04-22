# DA-Bubble Naming Schema

Use this schema for all future Copilot customization files in this workspace.

## Goals

- Keep names predictable.
- Make discovery easy for humans and Copilot.
- Avoid duplicate or overlapping customizations.

## File Types

### Instructions

Pattern: `<scope-or-domain>.instructions.md`

Examples:

- `angular-typescript.instructions.md`
- `firebase-security.instructions.md`
- `templates-accessibility.instructions.md`

Rules:

- One concern per file.
- `applyTo` must stay narrow and intentional.
- Prefer domain words over team-internal abbreviations.

### Agents

Pattern: `<domain>-<purpose>.agent.md`

Examples:

- `dashboard-flow.agent.md`
- `firebase-safety-reviewer.agent.md`
- `signals-store-refactor.agent.md`

Rules:

- Use a noun or domain first, then the job.
- Avoid generic names like `helper` or `general-review`.
- The frontmatter `agent:` value should match the user-facing name you want to invoke.

### Prompts

Pattern: `<verb>-<object>.prompt.md`

Examples:

- `add-feature.prompt.md`
- `review-state-impact.prompt.md`
- `pr-summary.prompt.md`

Rules:

- Start with an action verb.
- Keep prompts task-oriented, not domain-encyclopedic.
- Prefer one prompt per repeated workflow.

### Skills

Pattern: `.github/skills/<workflow-name>/SKILL.md`

Examples:

- `feature-change-workflow`
- `firebase-model-change`
- `ui-regression-check`

Rules:

- Folder name must match the workflow name.
- Use workflow language, not file-type language.
- A skill should exist only for repeatable multi-step work.

## Description Style

Use this pattern in frontmatter descriptions:

`Use when: ...`

Good:

- `Use when: changing a DA-Bubble signal store, computed state, effect logic, or stateful coordination service`

Avoid:

- vague phrasing
- internal shorthand without context
- descriptions that repeat only the file name

## Reserved Domain Words

Prefer these existing DA-Bubble words for consistency:

- `auth`
- `dashboard`
- `channel`
- `direct-message`
- `thread`
- `mailbox`
- `firebase`
- `signals-store`
- `ui-regression`
- `release-readiness`

## Avoid Duplication

Before creating a new file, check:

1. Can an existing prompt absorb the new task?
2. Is this actually a skill instead of a prompt?
3. Is this actually an instruction instead of an agent?
4. Does the name collide semantically with an existing file?