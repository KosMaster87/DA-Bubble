# DA-Bubble Copilot Setup

This folder contains the project-specific Copilot setup for DA-Bubble.

## What Is Here

- `copilot-instructions.md` for global always-on project rules
- `AGENTS.md` for the shared team workflow
- `instructions/` for scoped file-type and architecture rules
- `agents/` for specialized DA-Bubble chat modes
- `prompts/` for reusable task workflows
- `skills/` for repeatable multi-step playbooks
- `hooks/` for optional mixed-team hook templates and guardrails
- `governance/` for naming, ownership, and maintenance rules of this setup

## Recommended Usage

1. Start larger work with `/copilot-project`.
2. For multi-file changes, use the closest matching agent.
3. For state changes, run `review-state-impact` first.
4. For data-contract work, run `firestore-impact` first.
5. For feature work, use `add-feature`.
6. For reviews and cleanup, use the quality prompts.
7. For legacy-first discovery without edits, use `audit-legacy`.
8. For new customizations, follow the governance docs first.

## Important Note

This setup is DA-Bubble-specific. Keep it aligned with the real project architecture, not with generic Angular templates or other repos.
