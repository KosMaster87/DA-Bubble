# Docs Manual Index

This is the project-local entry point for DA-Bubble manual documentation.

## Dashboard Logic Documents

1. Warmup Stage 1.1 (Top-N + Config)
   [dashboard-warmup-stage-1-1.md](dashboard-warmup-stage-1-1.md)

2. End-to-End Reload/Unread Logic
   [unread-reload-logic.md](unread-reload-logic.md)

3. Thread Notifications Explained
   [thread-notifications-logic.md](thread-notifications-logic.md)

## Governance And Refactoring

1. Governance Index
   [governance/INDEX.md](governance/INDEX.md)

2. Naming Schema
   [governance/naming-schema.md](governance/naming-schema.md)

3. Refactoring Workflow
   [governance/refactoring-workflow.md](governance/refactoring-workflow.md)

## Recommended Reading Order

1. [governance/INDEX.md](governance/INDEX.md)
2. [governance/refactoring-workflow.md](governance/refactoring-workflow.md)
3. [unread-reload-logic.md](unread-reload-logic.md)
4. [dashboard-warmup-stage-1-1.md](dashboard-warmup-stage-1-1.md)
5. [thread-notifications-logic.md](thread-notifications-logic.md)

## Relevant Code Entry Points

- [src/app/shared/services/dashboard-initialization.service.ts](../../../src/app/shared/services/dashboard-initialization.service.ts)
- [src/app/core/services/unread/unread.service.ts](../../../src/app/core/services/unread/unread.service.ts)
- [src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.ts](../../../src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.ts)
- [src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.ts](../../../src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.ts)
