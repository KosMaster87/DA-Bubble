# ADR 0002: Channel-level admin management via existing `admins[]`

**Status:** Accepted
**Date:** 2026-08-31

## Context

`channel.model.ts` had a `ChannelMember.role: 'owner' | 'admin' | 'member'` interface
that was never imported or instantiated anywhere — dead code. The actual per-channel
privilege data already lived on `Channel` itself: `createdBy` (single owner UID) and
`admins: string[]`. `ChannelMemberStore` already had full, working `addAdmin`/
`removeAdmin`/`isUserAdmin` methods against that array — but nothing in the UI called
them, and several components carried `isCurrentUserAdmin` stubs hardcoded to `false`
with a `TODO: Implement admin role in User model` comment (a leftover from before the
platform-wide `User.role` field existed — see ADR 0001 — that TODO was actually about
this channel-scoped concept, not the platform one).

## Decision

- Keep using `Channel.createdBy` + `Channel.admins[]`. Delete the dead
  `ChannelMember.role` model instead of building it out.
- Only the channel **owner** (`createdBy`) can promote a member to channel-admin or
  demote a channel-admin back to member — existing channel-admins cannot manage other
  channel-admins. Mirrors the platform-level "only the owner promotes/demotes" rule
  from ADR 0001, at channel scope.
- No new Firestore rule was needed. The existing `channels/{channelId}` update rule
  already lets the creator update any field with no restriction — `admins[]` included.
  Only the narrower "members can update `members`/`updatedAt` only" branch is
  restricted; the creator branch always was unrestricted.
- No Callable Function, no audit log, at this scope — channel-admin changes are
  channel-local, lower blast radius than a platform-wide role, so the existing direct
  Firestore write (already implemented in `ChannelMemberStore`) is enough.
- `isCurrentUserAdmin`-style checks across the UI now read `channel.admins.includes(uid)`
  (owner counts as admin for UI purposes too, consistent with `isAdmin()` treating
  `owner` as implying `admin` at the platform level).

## Corrected assumption from initial research

Investigation during planning suggested channel deletion had no Firestore rule
enforcement (client-side `createdBy` check only). That was **wrong** — re-verified
against `dev`: the `channels/{channelId}` delete rule already required
`request.auth.uid == resource.data.createdBy`. No fix was needed or made here;
recorded so the incorrect finding doesn't get treated as still-open tech debt.

## Consequences

- Channel-admin promotion/demotion is a same-document array write, so it's eventually
  consistent with the channel's real-time listener like any other channel field —
  no extra plumbing needed for the UI to reflect a change.
- If channel-admin capabilities grow beyond "can remove a member" in the future, this
  ADR's "no rules change needed" reasoning should be re-checked — a broader admin
  capability set might need its own Firestore rule branch instead of relying on the
  creator's blanket update rights.

## Glossary

- **Channel owner**: the `createdBy` UID on a `Channel` document. Exactly one per
  channel, set at creation, never reassigned. Not to be confused with the platform
  **Owner** (`User.role: 'owner'`, exactly one across the whole app) — see ADR 0001.
- **Channel admin**: any UID in `Channel.admins[]`. Channel-scoped only; carries no
  platform-wide privilege and is unrelated to `User.role`.
