---
applyTo: "da-bubble/src/**/*"
---

# I18n And Copy

- DA-Bubble currently uses a custom signal-based `I18nService` under `core/services/i18n/`.
- Do not add `ngx-translate`, Angular i18n, or a second translation layer unless explicitly requested.
- Keep user-facing text consistent with the existing app tone and feature vocabulary.
- When adding new visible copy, consider both German and English impact.
- Prefer central translation keys or existing translation structures over scattering literals through templates.
- Do not silently switch terminology for channels, direct messages, threads, mailbox, workspace, or onboarding steps.
