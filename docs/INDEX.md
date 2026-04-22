# Docs: Unread, Reload, Warmup, Thread Notifications

This is the entry point for the current unread and thread logic in the dashboard.

## Documents

1. Warmup Stage 1.1 (Top-N + Config)
   [dashboard-warmup-stage-1-1.md](dashboard-warmup-stage-1-1.md)

2. End-to-End Reload/Unread Logic
   [unread-reload-logic.md](unread-reload-logic.md)

3. Thread Notifications Explained
   [thread-notifications-logic.md](thread-notifications-logic.md)

## Recommended Reading Order

1. [unread-reload-logic.md](unread-reload-logic.md)
2. [dashboard-warmup-stage-1-1.md](dashboard-warmup-stage-1-1.md)
3. [thread-notifications-logic.md](thread-notifications-logic.md)

## Relevant Code Entry Points

- [src/app/shared/services/dashboard-initialization.service.ts](../../src/app/shared/services/dashboard-initialization.service.ts)
- [src/app/core/services/unread/unread.service.ts](../../src/app/core/services/unread/unread.service.ts)
- [src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.ts](../../src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.ts)
- [src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.ts](../../src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.ts)
