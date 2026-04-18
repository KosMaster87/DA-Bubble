# Unread Reload Logic (End-to-End)

## Problem

Nach Reload waren Thread-Unread-Indikatoren in bestimmten Fällen verzögert sichtbar, besonders wenn nur Thread-Aktivität ohne normale Nachricht-Unread vorlag.

## Zielbild

Der Sidebar-Status soll nach Reload schnell und korrekt sein, ohne breitflächige Dauer-Listener.

## Architektur in Kurzform

1. Reload startet Dashboard-Initialisierung.
2. Unread-relevante Kandidaten werden ermittelt.
3. Kandidaten werden priorisiert und begrenzt (Stage 1.1).
4. Nachrichten und Thread-Kontexte werden als One-Shot geladen.
5. Sidebar und Popup rendern daraus Message- und Thread-Unread.

## Kernbausteine

1. Dashboard Warmup Orchestrierung

- [src/app/shared/services/dashboard-initialization.service.ts](../../src/app/shared/services/dashboard-initialization.service.ts)

2. Channel/DM Message Load und Snapshot-Verarbeitung

- [src/app/stores/channels/channel-message.store.ts](../../src/app/stores/channels/channel-message.store.ts)
- [src/app/stores/direct-messages/direct-message.store.ts](../../src/app/stores/direct-messages/direct-message.store.ts)
- [src/app/stores/helpers/direct-message-snapshot.helpers.ts](../../src/app/stores/helpers/direct-message-snapshot.helpers.ts)

3. Thread Snapshot Load

- [src/app/stores/threads/thread.store.ts](../../src/app/stores/threads/thread.store.ts)
- [src/app/stores/services/thread-listener.service.ts](../../src/app/stores/services/thread-listener.service.ts)

4. Unread Tracking und Markierung

- [src/app/core/services/unread/unread.service.ts](../../src/app/core/services/unread/unread.service.ts)
- [src/app/core/services/unread/unread-tracker.service.ts](../../src/app/core/services/unread/unread-tracker.service.ts)

## Wichtige Fachlogik

1. DM-Thread-only-Fallback
   Wenn normale DM-Unread nicht greift, kann dennoch Thread-Aktivität über bestehende Thread-Read-Keys erkannt werden.

2. DM Snapshot Order
   DM-Snapshots werden in zeitlich korrekte Reihenfolge normalisiert, damit UI/Unread-Berechnungen konsistent sind.

3. One-Shot statt Dauer-Listener
   Warmup lädt Initialzustand, beendet dann den Listener. Live-Verhalten bleibt über aktive Konversationen verfügbar.

## Debug-Checkliste

1. Wird der Kandidat durch `hasUnread` oder `hasPotentialThreadUnreadActivity` erkannt?
2. Liegt der Kandidat in Top-N nach `lastMessageAt`?
3. Läuft der One-Shot-Snapshot durch?
4. Sind Thread-Snapshots für betroffene Parent-Messages geladen?
5. Ist die Sidebar auf denselben Unread-Quellen aufgebaut?

## Zugehörige Doku

- Stage 1.1 Details: [dashboard-warmup-stage-1-1.md](dashboard-warmup-stage-1-1.md)
- Thread Notifications separat: [thread-notifications-logic.md](thread-notifications-logic.md)
