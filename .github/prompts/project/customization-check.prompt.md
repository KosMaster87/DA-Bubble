---
description: "Use when: proposing or reviewing a new DA-Bubble instruction, prompt, agent, skill, or hook and you want to check naming, overlap, and governance fit first."
tools:
  - search/codebase
---

# Customization Check

Review a proposed `.github` customization before creating or editing it.

## Check

1. Which primitive is the right one: instruction, prompt, agent, skill, or hook?
2. Does an existing DA-Bubble customization already cover the need?
3. Does the proposed name follow `governance/naming-schema.md`?
4. Is the `description` specific enough to be discoverable?
5. Is the scope intentionally narrow?

## Output

- Recommended primitive.
- Proposed file name.
- Overlap with existing files.
- Required wording changes.
- Final recommendation: create, merge into existing, or reject.