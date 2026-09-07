# ADR 0001: Platform-wide admin role via owner-gated callable

**Status:** Accepted
**Date:** 2026-08-31

## Context

The Firestore rule that lets a client create `mailbox` messages of `type: 'admin'` or
`'system'` had a standing TODO: any authenticated user could set that type, since no
concept of a platform-wide admin role existed yet. `User` had no `role` field, and no
UI or backend enforced who could be trusted with elevated actions.

## Decision

- `User.role?: 'member' | 'admin' | 'owner'`. Exactly one `owner` is expected to exist.
- Firestore rules never allow a client to write `role` at all, in either direction —
  not on create (locked to `'member'`), not on update, not even by an existing admin.
  The only paths that can set it are:
  - `functions/scripts/set-admin-role.js` — a local operator script using Application
    Default Credentials, for bootstrapping the very first owner/admin.
  - `setUserRole` (`functions/src/admin/set-user-role.ts`) — a callable Cloud Function,
    callable only by the current owner, for every promote/demote after that.
- `isAdmin()` in `firestore.rules` treats `'admin'` and `'owner'` as equivalent —
  owner implies every admin capability.
- Every role change writes an `auditLog` entry in the same batch as the role update,
  so the log can never drift from what actually happened. The collection is
  admin-readable, never client-writable.
- The owner's own role is out of scope for `setUserRole` — ownership only moves via
  the bootstrap script. There is no ownership-transfer UI in this iteration.
- Regular admins cannot promote or demote anyone; only the owner can.

## Consequences

- No lockout risk: because the owner always has `isAdmin()` rights and can never be
  demoted through the Admin Panel, there is no scenario where the app ends up with
  zero effective admins — an explicit "last admin" guard was considered and dropped
  as unnecessary complexity.
- Granting the very first owner/admin is a manual, local operation (`pnpm run
set-admin -- <email> [admin|owner]` in `functions/`). It only works for someone who
  already has Editor/Owner IAM access on the actual Firebase/GCP project — the script
  uses the Admin SDK, which bypasses Firestore rules entirely, so project IAM (not the
  script's presence in a cloned repo) is the real security boundary here.
- This ADR does not cover channel-level admin management (`Channel.admins[]`,
  channel-owner-appointed channel-admins) — that is a separate, smaller decision;
  see ADR 0002.
- Deferred to a later iteration: an Admin UI for ownership transfer, and Firestore
  Rules Unit tests (`@firebase/rules-unit-testing`) for `isAdmin()`/`setUserRole`
  authorization paths.

## Glossary

- **Owner** (platform): the single account with `role: 'owner'`. Implies admin. Can
  promote/demote between `member` and `admin`. Cannot be changed via the Admin Panel.
  Not to be confused with **channel owner** (`Channel.createdBy`), a per-channel
  concept — see ADR 0002.
- **Admin** (platform): `role: 'admin'`. Currently unlocks admin/system mailbox
  message creation; more admin-only capabilities may be added later without another
  role-model change.
