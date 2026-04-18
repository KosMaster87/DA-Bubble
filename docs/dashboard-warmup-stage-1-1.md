# Dashboard Warmup Stage 1.1

## Ziel

Beim ersten Dashboard-Reload korrekte Unread/Thread-Unread-Indikatoren zeigen und gleichzeitig Firestore-Reads deckeln.

## Ausgangslage

Ohne Begrenzung konnten viele unread-relevante Kontexte gleichzeitig gewarmt werden. Das führt zu unnötigen parallelen Reads.

## Stage-1.1 Lösung

1. Kandidaten nur aus unread-relevanten Channels/DMs.
2. Sortierung nach `lastMessageAt` absteigend.
3. Begrenzung auf Top-N.
4. Warmup immer als One-Shot (`once: true`).

Implementierung in:

- [src/app/shared/services/dashboard-initialization.service.ts](../../src/app/shared/services/dashboard-initialization.service.ts)

## Konfigurierbarkeit

Die Limits sind per Injection Token konfigurierbar:

- `DASHBOARD_WARMUP_CONFIG`
- Typ: `DashboardWarmupConfig`

Default-Werte:

- `maxChannelWarmupCandidates = 5`
- `maxDmWarmupCandidates = 5`

Ungültige Werte werden geschützt (Minimum 1).

## Override Beispiel

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

## Wirkung

Das Reload-Warmup hat eine klare obere Schranke:

- maximal N Channel-Warmups
- maximal N DM-Warmups

Dadurch stabilere Kosten und vorhersehbares Startverhalten.

## Trade-off

Kontexte außerhalb Top-N werden nicht sofort gewarmt. Der vollständige Zustand wird beim Öffnen der jeweiligen Konversation geladen.

## Testabdeckung

- [src/app/shared/services/dashboard-initialization.service.spec.ts](../../src/app/shared/services/dashboard-initialization.service.spec.ts)

Abgedeckt sind:

1. Standardverhalten (Top-5)
2. Begrenzung bei Channels
3. Begrenzung bei DMs
4. Custom-Config Override
