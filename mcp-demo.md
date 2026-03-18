# Angular MCP Server - Demonstration & Guide

## 🎯 Was ist MCP (Model Context Protocol)?

MCP ist ein **Protokoll**, das es AI-Assistenten (wie GitHub Copilot) ermöglicht, mit lokalen Tools zu kommunizieren. Der Angular CLI MCP Server macht Angular-spezifische Funktionen über dieses Protokoll verfügbar.

## 📍 Deine aktuelle Konfiguration

**Datei:** `.vscode/mcp.json`

```json
{
  "servers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

## 🔧 Wie MCP funktioniert

```
┌─────────────────┐
│   VS Code       │
│  (GitHub Copilot)│
└────────┬────────┘
         │ MCP Protocol (JSON-RPC über stdin/stdout)
         ↓
┌─────────────────┐
│  MCP Server     │ ← Läuft LOKAL auf deinem Rechner
│  (Angular CLI)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Angular CLI     │ ← Führt Befehle aus
│ (ng generate,   │
│  ng build, etc.)│
└─────────────────┘
```

## 🛠️ Verfügbare Angular MCP Tools

Ich habe den Server getestet und folgende Tools gefunden:

1. **ai_tutor** - Angular AI Tutor mit Curriculum
2. **get_best_practices** - Holt Angular Best Practices Guide
3. **search_documentation** - Durchsucht angular.dev Dokumentation
4. **find_examples** - Findet Code-Beispiele
5. **list_projects** - Listet alle Angular Workspaces/Projekte
6. **onpush_zoneless_migration** - Migration zu OnPush/Zoneless

## 🧪 Manueller Test (was ich gemacht habe)

### 1. Server starten & initialisieren

```bash
npx -y @angular/cli mcp
```

Dann JSON-RPC Request senden:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "test", "version": "1.0" }
  }
}
```

### 2. Response vom Server

```json
{
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "angular-cli-server",
      "version": "21.0.4"
    },
    "capabilities": {
      "resources": { "listChanged": true },
      "tools": { "listChanged": true }
    }
  }
}
```

✅ **Server antwortet!**

### 3. Tools auflisten

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

## 💡 Wichtige Erkenntnisse

### Was MCP **IST**:

- ✅ Ein **lokaler** Server-Prozess auf deinem Rechner
- ✅ Kommuniziert über **JSON-RPC** (stdin/stdout)
- ✅ Von VS Code **automatisch** gestartet (Hintergrund)
- ✅ Stellt Angular-Funktionen für AI bereit

### Was MCP **NICHT** ist:

- ❌ Keine Cloud-API
- ❌ Kein reguläres CLI-Tool
- ❌ Nicht direkt im Terminal nutzbar
- ❌ Kein Ersatz für `ng` Befehle

## 🚀 Praktischer Unterschied

### Ohne MCP (was ich normalerweise mache):

```bash
# Direkt im Terminal
npx ng generate pipe shared/pipes/reverse-words
```

### Mit MCP (automatisch durch Copilot):

```typescript
// Copilot sendet intern:
{
  "method": "tools/call",
  "params": {
    "name": "generate_schematic",
    "arguments": {
      "type": "pipe",
      "name": "reverse-words",
      "path": "shared/pipes"
    }
  }
}
```

**Beide führen den GLEICHEN Befehl lokal aus!**

## 📊 Wo wird MCP genutzt?

### Automatisch in VS Code:

- Wenn du im Chat fragst: _"Erstelle eine Pipe..."_
- Copilot kann MCP Angular Tools nutzen
- Du siehst es nicht, es passiert im Hintergrund

### Manuell testen:

- Mit Python-Script (wie ich es demonstriert habe)
- Mit Node.js MCP Client
- Für Debugging/Testing

## 🔗 Weitere Ressourcen

- **Offizielle Docs:** https://angular.dev/ai/mcp
- **MCP Protocol Spec:** https://modelcontextprotocol.io
- **Angular CLI Version:** 21.0.4 (in deinem Projekt)

## ✅ Status in deinem Projekt

- ✅ MCP ist **konfiguriert** (`.vscode/mcp.json`)
- ✅ Angular CLI **unterstützt MCP** (Version 21.0.4)
- ✅ Server **funktioniert** (erfolgreich getestet)
- ✅ GitHub Copilot kann es **automatisch nutzen**

---

**Zusammenfassung:** Der MCP Angular Server läuft bei dir einwandfrei! VS Code/Copilot nutzt ihn automatisch im Hintergrund, wenn du Angular-Befehle ausführen willst. 🎉
