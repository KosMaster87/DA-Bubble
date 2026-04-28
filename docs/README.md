# Dokumentation

## Struktur

| Ordner       | Inhalt                        | Bearbeitung |
| ------------ | ----------------------------- | ----------- |
| `manual/`    | Eigene Guides, ADRs, Runbooks | Manuell     |
| `generated/` | TypeDoc API-Referenz          | Automatisch |

## Befehle

| Befehl               | Ergebnis                      |
| -------------------- | ----------------------------- |
| `npm run docs:dev`   | Docusaurus Dev-Server starten |
| `npm run docs:site`  | Docusaurus-Site bauen         |
| `npm run docs:serve` | Fertigen Build lokal anzeigen |

> **Wichtig:** Niemals manuell in `generated/` schreiben.
> Änderungen dort werden beim nächsten Build überschrieben.

---

> **Herkunft bestimmt den Ordner.**
> Du hast es geschrieben → `manual/`.
> Ein Tool hat es erzeugt → `generated/`.
> Ein Build hat es gebaut → `docs-site/build/`.
> Niemals mischen.
