# DA-Bubble Customization Governance

This document defines how the `.github` Copilot setup should evolve over time.

## Decision Rules

Use the smallest suitable primitive.

- `copilot-instructions.md`: project-wide truth that should always apply
- `.instructions.md`: scoped coding rules tied to file patterns
- `.prompt.md`: repeatable task entry points
- `.agent.md`: specialized working modes for larger or riskier tasks
- `SKILL.md`: multi-step workflows that should be reused

## Change Checklist

Before adding or editing a customization:

1. Confirm the problem is DA-Bubble-specific, not just generic Angular advice.
2. Check whether the change belongs in workspace instructions, a scoped instruction, a prompt, an agent, or a skill.
3. Review overlap with existing files.
4. Write the `description` so Copilot can discover it.
5. Keep the change minimal and name the owning domain.

## Review Standard

Every new customization should answer these questions:

- What user workflow or engineering risk does it address?
- Why is the existing setup not enough?
- Which files or features does it intentionally target?
- What should not use it?

## Ownership

- `copilot-instructions.md` and `AGENTS.md` are the top-level source of truth.
- Domain instructions should be updated when the code architecture changes.
- Prompts and agents should be pruned if they are no longer used.
- Skills should stay reserved for repeatable workflows with clear payoff.

## Maintenance Rules

- Prefer editing existing files over adding near-duplicates.
- Remove stale references when architecture changes.
- Keep examples aligned with the real DA-Bubble stack.
- If a customization starts mentioning tools or libraries not used by DA-Bubble, fix it immediately.