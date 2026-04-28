# Unread Reload Logic (End-to-End)

## Problem

After a reload, thread-unread indicators were sometimes delayed, especially when only thread activity existed without a regular message-unread.

## Target Behavior

Sidebar state should be fast and accurate after reload, without broad persistent listeners.

## Architecture Overview

1. Reload triggers dashboard initialization.
2. Unread-relevant candidates are identified.
3. Candidates are prioritized and limited (Stage 1.1).
4. Messages and thread contexts are loaded as one-shot.
5. Sidebar and popup render message and thread unreads from that data.

## Core Building Blocks

1. Dashboard Warmup Orchestration

- [src/app/shared/services/dashboard-initialization.service.ts](../../src/app/shared/services/dashboard-initialization.service.ts)

2. Channel/DM Message Load and Snapshot Processing

- [src/app/stores/channels/channel-message.store.ts](../../src/app/stores/channels/channel-message.store.ts)
- [src/app/stores/direct-messages/direct-message.store.ts](../../src/app/stores/direct-messages/direct-message.store.ts)
- [src/app/stores/helpers/direct-message-snapshot.helpers.ts](../../src/app/stores/helpers/direct-message-snapshot.helpers.ts)

3. Thread Snapshot Load

- [src/app/stores/threads/thread.store.ts](../../src/app/stores/threads/thread.store.ts)
- [src/app/stores/services/thread-listener.service.ts](../../src/app/stores/services/thread-listener.service.ts)

4. Unread Tracking and Marking

- [src/app/core/services/unread/unread.service.ts](../../src/app/core/services/unread/unread.service.ts)
- [src/app/core/services/unread/unread-tracker.service.ts](../../src/app/core/services/unread/unread-tracker.service.ts)

## Key Business Logic

1. DM Thread-only Fallback
   When regular DM unread does not apply, thread activity can still be detected via existing thread-read keys.

2. DM Snapshot Order
   DM snapshots are normalized into chronological order to keep UI/unread calculations consistent.

3. One-Shot Instead of Persistent Listener
   Warmup loads the initial state, then terminates the listener. Live behavior remains available through active conversations.

## Debug Checklist

1. Is the candidate detected via `hasUnread` or `hasPotentialThreadUnreadActivity`?
2. Does the candidate fall within Top-N by `lastMessageAt`?
3. Does the one-shot snapshot complete?
4. Are thread snapshots loaded for affected parent messages?
5. Is the sidebar built from the same unread sources?

## Related Docs

- Stage 1.1 details: [dashboard-warmup-stage-1-1.md](dashboard-warmup-stage-1-1.md)
- Thread notifications: [thread-notifications-logic.md](thread-notifications-logic.md)
