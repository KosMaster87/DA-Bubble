# Hooks And Quality Guardrails

This folder contains optional hook templates and guardrails for teams that mix Copilot in VS Code with hook-capable assistants.

## Important Limitation

GitHub Copilot in VS Code does not provide Claude-style tool-loop hooks.

For Copilot, the practical equivalents are:

- scoped instructions
- reusable prompts
- git hooks such as Husky
- CI checks

## What Is Here

- `claude-da-bubble-guardrails.json`: lightweight policy reminders for DA-Bubble-specific risks
- `claude-da-bubble-stop-checks.json`: end-of-task summary checks for mixed-agent workflows

## Recommended Use

- Treat these files as templates, not mandatory runtime configuration.
- Keep hard quality enforcement in Git hooks and CI.
- Keep hook logic fast and local.
- Do not put full builds into edit-time hooks.

## Good Candidates For Real Enforcement

- forbid `BehaviorSubject` in app state work
- flag accidental `ngx-translate` introduction
- remind about Firebase security review when rules, functions, or storage paths change
- remind about responsive regression review for dashboard changes