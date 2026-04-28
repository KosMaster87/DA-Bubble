# Dashboard Warmup Stage 1.1

## Goal

On the first dashboard reload, show correct unread/thread-unread indicators while capping Firestore reads.

## Background

Without limits, many unread-relevant contexts could be warmed up simultaneously, leading to unnecessary parallel reads.

## Stage 1.1 Solution

1. Candidates only from unread-relevant channels/DMs.
2. Sorted by `lastMessageAt` descending.
3. Limited to Top-N.
4. Warmup always as one-shot (`once: true`).

Implemented in:

- [src/app/shared/services/dashboard-initialization.service.ts](../../src/app/shared/services/dashboard-initialization.service.ts)

## Configuration

Limits are configurable via injection token:

- `DASHBOARD_WARMUP_CONFIG`
- Type: `DashboardWarmupConfig`

Defaults:

- `maxChannelWarmupCandidates = 5`
- `maxDmWarmupCandidates = 5`

Invalid values are guarded (minimum 1).

## Override Example

In [src/app/app.config.ts](../../src/app/app.config.ts):

```ts
import { DASHBOARD_WARMUP_CONFIG } from './shared/services/dashboard-initialization.service';

{
  provide: DASHBOARD_WARMUP_CONFIG,
  useValue: {
    maxChannelWarmupCandidates: 3,
    maxDmWarmupCandidates: 3,
  },
}
```

## Effect

The reload warmup has a clear upper bound:

- at most N channel warmups
- at most N DM warmups

This results in more stable costs and predictable startup behavior.

## Trade-off

Contexts outside Top-N are not warmed up immediately. The full state is loaded when the respective conversation is opened.

## Test Coverage

- [src/app/shared/services/dashboard-initialization.service.spec.ts](../../src/app/shared/services/dashboard-initialization.service.spec.ts)

Covered cases:

1. Default behavior (Top-5)
2. Channel limit enforcement
3. DM limit enforcement
4. Custom config override
