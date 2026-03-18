# GitHub MCP Server - Capabilities & Guide

## 🎯 Was ist der GitHub MCP Server?

Der GitHub MCP Server ist eine Erweiterung des MCP Protokolls speziell für GitHub.
Er ermöglicht GitHub Copilot, **direkt mit der GitHub API** zu kommunizieren – ohne dass du
manuell `gh`-Befehle tippen oder die GitHub-Webseite öffnen musst.

## 📍 Deine aktuelle Konfiguration

**Datei:** `.vscode/mcp.json`

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

Der `github`-Server läuft **in der Cloud** (nicht lokal) und kommuniziert über HTTPS mit
der GitHub API. Authentifizierung erfolgt automatisch über dein GitHub Copilot Token.

---

## 🛠️ Was kann ich mit dem GitHub MCP machen?

### 1. 📂 Repositories auflisten & lesen

**Alle Repos in deinem Account einlesen:**

```
"Zeig mir alle meine GitHub Repositories"
"List my GitHub repositories"
"Welche Repos habe ich in meinem Account?"
```

**Details zu einem spezifischen Repo:**

```
"Was steht im README von KosMaster87/DABubble?"
"Zeig mir die Ordnerstruktur von meinem DABubble Repo"
"Welche Branches gibt es in KosMaster87/DABubble?"
```

**Dateiinhalte lesen:**

```
"Lies die Datei src/app/app.config.ts aus meinem DABubble Repo"
"Zeig mir den Inhalt von package.json"
```

---

### 2. 🐛 Issues verwalten

**Issues anzeigen:**

```
"Zeig mir alle offenen Issues in KosMaster87/DABubble"
"Welche Issues sind mit dem Label 'bug' markiert?"
"Gibt es Issues über das Login-Problem?"
```

**Issues erstellen:**

```
"Erstelle ein Issue: 'Dark Mode bricht auf Safari' mit Label 'bug'"
"Erstelle ein Feature-Request für eine Benachrichtigungs-Funktion"
```

**Issues kommentieren & schließen:**

```
"Kommentiere auf Issue #42: 'Dieser Bug wurde in Branch fix/login gefixt'"
"Schließe Issue #15"
```

---

### 3. 🔀 Pull Requests verwalten

**PRs anzeigen:**

```
"Zeig mir alle offenen Pull Requests in meinem DABubble Repo"
"Was ändert PR #7?"
"Wer hat PRs eingereicht die noch nicht reviewed wurden?"
```

**PR Details & Diff:**

```
"Zeig mir den Diff von PR #12"
"Was sind die geänderten Dateien in PR #5?"
"Welche Review-Kommentare gibt es auf PR #3?"
```

**PR erstellen:**

```
"Erstelle einen PR von Branch feature/dark-mode nach main"
"Erstelle einen Draft-PR mit Titel 'WIP: Neue Message-Komponente'"
```

---

### 4. 🔍 Code suchen

**Im Repository suchen:**

```
"Suche in meinem Repo nach allen Stellen wo 'AuthStore' verwendet wird"
"Wo wird 'patchState' aufgerufen in den Stores?"
"Finde alle Komponenten die das UserStore importieren"
```

**GitHub-weit suchen:**

```
"Suche auf GitHub nach Angular SignalStore Beispielen"
"Finde öffentliche Repos mit Firebase + Angular 18"
```

---

### 5. 📊 Releases & Tags

**Releases anzeigen:**

```
"Welche Releases gibt es in meinem Repo?"
"Was war das letzte Release von KosMaster87/DABubble?"
```

**Release erstellen:**

```
"Erstelle ein Release v1.0.0 mit Changelog aus den letzten Commits"
```

---

### 6. 🔐 Code Scanning & Security

**Security Alerts anzeigen:**

```
"Gibt es Security Alerts in meinem Repo?"
"Zeig mir alle Code Scanning Warnungen"
"Welche Dependabot Alerts sind offen?"
```

---

### 7. ⚙️ GitHub Actions

**Workflow Runs anzeigen:**

```
"Zeig mir die letzten CI/CD Pipeline Runs"
"Warum ist der letzte Build fehlgeschlagen?"
"Welche Workflows gibt es in meinem Repo?"
```

---

## 🔧 Praktische Beispiele für DABubble

### Beispiel 1: Repository-Übersicht

> **Du:** "Kannst du mir alle Branches in meinem DABubble Repo zeigen und den letzten Commit pro Branch?"

Copilot nutzt GitHub MCP um:
1. `list_branches` aufzurufen
2. Für jeden Branch den letzten Commit abzurufen
3. Eine übersichtliche Zusammenfassung zu erstellen

---

### Beispiel 2: Bug-Tracking

> **Du:** "Erstelle ein Issue für den Fehler den wir gerade gefunden haben: Der Channel-Name wird im Header nicht aktualisiert wenn man den Channel wechselt"

Copilot erstellt automatisch:
- Einen aussagekräftigen Titel
- Eine detaillierte Beschreibung
- Schlägt passende Labels vor (`bug`, `ui`)

---

### Beispiel 3: Code Review vorbereiten

> **Du:** "Fasse alle Änderungen in PR #3 zusammen und erstelle eine Review-Checkliste"

Copilot liest den PR-Diff und erstellt eine strukturierte Checkliste für den Code Review.

---

## 📊 Vergleich: GitHub MCP vs. Manuell

| Aufgabe | Ohne MCP | Mit GitHub MCP |
|---------|----------|----------------|
| Issues anzeigen | GitHub Website öffnen | Direkt im Chat fragen |
| Branch erstellen | `git checkout -b feature/...` | Natürlichsprachlicher Befehl |
| PR erstellen | GitHub Website + Formular | Einzeiler im Chat |
| Code suchen | `git grep` oder GitHub Search | "Wo wird X verwendet?" |
| CI-Fehler analysieren | Log manuell lesen | "Warum ist der Build rot?" |

---

## ✅ Zusammenfassung: Was GitHub MCP **kann**

| Funktion | Beschreibung |
|----------|-------------|
| ✅ Repos lesen | Alle Repos, Dateien, Branches |
| ✅ Issues | Erstellen, lesen, kommentieren, schließen |
| ✅ Pull Requests | Erstellen, reviewen, mergen |
| ✅ Code suchen | Dateien, Symbole, Text |
| ✅ Actions/CI | Runs anzeigen, Logs lesen |
| ✅ Releases | Erstellen, anzeigen |
| ✅ Security | Alerts und Scanning-Ergebnisse |

## ❌ Was GitHub MCP **nicht** kann

| Einschränkung | Details |
|---------------|---------|
| ❌ Lokal auschecken | Kein `git clone` oder lokale Änderungen |
| ❌ Direkt pushen | Nur über Copilot-geführte Aktionen |
| ❌ Secrets lesen | GitHub Secrets sind geschützt |
| ❌ Private Org-Repos | Nur wenn du Zugriff hast |

---

## 🚀 Tipp: MCP Angular + MCP GitHub kombinieren

Du kannst beide MCP Server gleichzeitig nutzen:

```
"Erstelle eine neue Angular Component 'notification-badge' via Angular CLI
 und danach ein Issue 'Feature: Notification Badge Component' auf GitHub"
```

Copilot nutzt:
1. **Angular MCP** → `ng generate component`
2. **GitHub MCP** → Issue erstellen

**Das ist die volle Power von MCP!** 🎉
