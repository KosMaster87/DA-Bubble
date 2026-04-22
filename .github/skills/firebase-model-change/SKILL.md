---
name: firebase-model-change
description: "Use when: a DA-Bubble change affects Firebase document shape, collections, rules, storage paths, indexes, or Cloud Functions"
---

# Firebase Model Change

## Steps

1. Identify changed collections, fields, or storage paths.
2. Review affected client models, stores, services, and guards.
3. Review `firestore.rules`, `storage.rules`, and any functions that rely on the same contract.
4. Check whether indexes or migration steps are needed.
5. Verify auth and membership assumptions.
6. Add tests or explicit manual verification notes.

## Guardrails

- Do not weaken security rules for UI convenience.
- Keep data contracts explicit.
- Prefer root-cause fixes over permissive fallbacks.
