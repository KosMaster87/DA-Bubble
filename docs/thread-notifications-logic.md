# Thread Notifications: Eigene Erklärung

## Was ist eine Thread Notification hier?

Im aktuellen DA-Bubble-Kontext bedeutet das:

1. Ein Parent-Message-Thread hat neue Replies.
2. Die Replies sind für den User unread.
3. Der User hat am Thread teilgenommen (Reply geschrieben oder Parent erstellt).
4. Die Information erscheint als Thread-Unread-Indikator in Sidebar/Popup.

## Datenbasis

1. Parent Message

- `lastThreadTimestamp`
- optional `threadCount`

2. Thread Replies

- liegen unter Thread-Subcollection

3. User Read-Stand

- `lastRead.<conversationId>_thread_<messageId>`

## Entscheidungslogik (vereinfacht)

Ein Thread wird als unread gewertet, wenn:

1. Thread-Aktivität vorhanden ist (`lastThreadTimestamp` oder Replies).
2. User-Teilnahme erfüllt ist.
3. Letzte Thread-Aktivität nach dem gespeicherten Thread-Read-Zeitpunkt liegt.

## Wo diese Logik lebt

1. Thread-Unread Tracking/Checks

- [src/app/core/services/unread/unread-tracker.service.ts](../../src/app/core/services/unread/unread-tracker.service.ts)
- [src/app/core/services/unread/unread.service.ts](../../src/app/core/services/unread/unread.service.ts)

2. Thread Popup Darstellung

- [src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.ts](../../src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.ts)

3. Sidebar-Verknüpfung

- [src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.ts](../../src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.ts)

## Warum eigene Logik statt nur Conversation-Unread?

Normale Conversation-Unread und Thread-Unread sind unterschiedliche Signale:

1. Conversation-Unread zeigt neue Nachrichten auf Konversationsebene.
2. Thread-Unread zeigt neue Antworten innerhalb bestehender Message-Threads.

Dadurch kann ein Zustand entstehen mit:

- keine neue Hauptnachricht
- aber neue Thread-Replies

Genau diese Fälle sollen sichtbar bleiben.

## Reload-Verhalten

1. Warmup lädt priorisierte Kandidaten als One-Shot.
2. Thread-Kontexte werden bei Bedarf nachgeladen.
3. Sidebar/Popup zeigen daraus Thread-Unread ohne globale Dauer-Listener.

## Typische Fehlerbilder

1. Thread-Unread erscheint erst nach neuer Live-Nachricht.
2. DM-Thread-only-Fälle werden nicht gewarmt.
3. Reihenfolgefehler in Snapshot-Verarbeitung verfälschen die Anzeige.

## Was wir aktuell dagegen tun

1. One-Shot Warmup für unread-relevante Kandidaten.
2. Top-N Priorisierung für kontrollierte Kosten.
3. DM-Thread-only-Fallback über potenzielle Thread-Aktivität.
4. Testabdeckung auf Service- und UI-Ebene.

## Zugehörige Tests

- [src/app/shared/services/dashboard-initialization.service.spec.ts](../../src/app/shared/services/dashboard-initialization.service.spec.ts)
- [src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.spec.ts](../../src/app/shared/dashboard-components/thread-unread-popup/thread-unread-popup.component.spec.ts)
- [src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.spec.ts](../../src/app/features/dashboard/components/workspace-sidebar/workspace-sidebar.component.spec.ts)
