---
applyTo: "da-bubble/**/*"
---

# Firebase And Security

- DA-Bubble uses AngularFire, Firestore, Storage, Auth, Firebase rules, and Cloud Functions.
- Any change affecting Auth, Firestore, Storage, rules, or functions must preserve existing authorization intent.
- Never weaken `firestore.rules` or `storage.rules` just to unblock the UI.
- If a data model changes, verify client usage, rules, indexes, and functions together.
- Keep verified-user and owner/member checks explicit.
- Prefer a clear contract between client models and Firebase documents over defensive guesswork in every component.
- Treat guest flows, verified-email flows, channel membership, and attachment access as security-sensitive paths.
