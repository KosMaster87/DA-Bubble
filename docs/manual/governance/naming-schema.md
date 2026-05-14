# Naming Schema — DA-Bubble Manual

Use this schema for project-local documentation and refactoring artifacts that belong to DA-Bubble itself.

## Scope Split

- `docs/manual/` is for project-specific documentation, decisions, workflows, and reading guides.
- `.github/` is for reusable Copilot setup, instructions, prompts, agents, skills, and governance around those customizations.
- Do not move DA-Bubble manual documentation into the shared workspace folder `@dev2k/.github`.

## Documentation Files

### Folder Index Files

Pattern: `INDEX.md`

Use when:

- a folder needs a human entry point
- a folder contains more than one relevant document
- a document collection needs reading order or navigation help

Examples:

- `docs/manual/INDEX.md`
- `docs/manual/governance/INDEX.md`

Rules:

- Use uppercase `INDEX.md` for documentation overviews.
- Keep the index focused on navigation, reading order, and purpose.
- Link only to documents that belong to the same local manual structure.

### Topic Documents

Pattern: `<topic>.md`

Examples:

- `refactoring-workflow.md`
- `repo-policy.md`
- `thread-notifications-logic.md`

Rules:

- Use kebab-case.
- Use explicit domain words instead of vague names like `notes.md` when the file is intended to stay long-term.
- Prefer one durable topic per file.

## Code Export Files

### Barrel Files

Pattern: `index.ts`

Use when:

- a folder exposes a stable public API
- multiple sibling exports are intentionally grouped
- consumers should import from one boundary instead of deep paths

Rules:

- Keep barrel files close to the owning domain folder.
- Re-export only the intended public surface.
- Do not create multi-level barrel chains just to shorten imports.
- Do not export private helpers only because a barrel exists.

### Helper Files

Pattern: `<domain>-<purpose>.helper.ts` or `<domain>-<purpose>.helpers.ts`

Use when:

- logic is pure or nearly pure
- logic does not need Angular DI
- the same transformation or mapping would otherwise be duplicated

Rules:

- Keep helpers stateless where possible.
- Prefer colocating helpers with the owning store, service, or feature.
- Name helpers by responsibility, not by implementation detail.

### Service Files

Pattern: `<domain>.service.ts` or `<domain>-<purpose>.service.ts`

Use when:

- logic coordinates I/O, subscriptions, orchestration, or domain actions
- Angular dependency injection is required
- the component or store should delegate side effects to a dedicated abstraction

Rules:

- Keep services intention-revealing and narrowly scoped.
- Avoid pushing writable app state into services when a store already owns it.
- Prefer extracting helper modules before splitting one service into many tiny wrappers.
