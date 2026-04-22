---
description: "Use when: a DA-Bubble change affects Firestore collections, document shape, Firebase rules, indexes, or functions and you want the full impact listed first."
tools:
  - search/codebase
---

# Firestore Impact Review

Review the requested Firestore-related change across the whole DA-Bubble workspace.

## Check

1. Affected collections, subcollections, or document fields.
2. Affected client models, stores, services, and guards.
3. Whether `firestore.rules` or `storage.rules` assumptions change.
4. Whether indexes or Cloud Functions might need updates.
5. Whether existing auth, membership, or verified-email assumptions are affected.

## Output

Return findings grouped as:

- Data contract changes
- Security and rule impact
- Functions and backend impact
- Client update list
- Testing and verification steps
