# Thread Notifications: Explained

## What is a Thread Notification here?

In the DA-Bubble context, this means:

1. A parent message thread has new replies.
2. The replies are unread for the user.
3. The user has participated in the thread (wrote a reply or created the parent).
4. The information appears as a thread-unread indicator in the sidebar/popup.

## Data Sources

1. Parent Message

- `lastThreadTimestamp`
- optional `threadCount`

2. Thread Replies

- stored in the thread subcollection

3. User Read State

- `lastRead.<conversationId>_thread_<messageId>`

## Decision Logic (simplified)

A thread is considered unread when:

1. Thread activity exists (`lastThreadTimestamp` or replies).
2. User participation is confirmed.
3. Last thread activity is after the stored thread-read timestamp.

## Where This Logic Lives

1. Thread-Unread Tracking/Checks

- [src/app/core/services/unread/unread-tracker.service.ts](../../src/app/core/services/unread/unread-tracker.service.ts)
- [src/app/core/services/unread/unread.service.ts](../../src/app/core/services/unread/unread.service.ts)

2. Thread Popup Rendering

- [src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.ts](../../src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.ts)

3. Sidebar Integration

- [src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.ts](../../src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.ts)

## Why Separate Logic Instead of Conversation-Unread?

Conversation-unread and thread-unread are distinct signals:

1. Conversation-unread shows new messages at the conversation level.
2. Thread-unread shows new replies within existing message threads.

This means a state can exist where:

- no new top-level message
- but new thread replies

These cases must remain visible.

## Reload Behavior

1. Warmup loads prioritized candidates as one-shot.
2. Thread contexts are loaded on demand.
3. Sidebar/popup derive thread-unread without global persistent listeners.

## Known Failure Patterns

1. Thread-unread only appears after a new live message arrives.
2. DM-thread-only cases are not warmed up.
3. Ordering errors in snapshot processing skew the display.

## Current Mitigations

1. One-shot warmup for unread-relevant candidates.
2. Top-N prioritization for controlled Firestore costs.
3. DM-thread-only fallback via potential thread activity detection.
4. Test coverage at service and UI level.

## Related Tests

- [src/app/shared/services/dashboard-initialization.service.spec.ts](../../src/app/shared/services/dashboard-initialization.service.spec.ts)
- [src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.spec.ts](../../src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.spec.ts)
- [src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.spec.ts](../../src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.spec.ts)
