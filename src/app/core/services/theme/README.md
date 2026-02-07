# DABubble Theme System

Das Theme-System für DABubble mit Dark/Light Mode und Browser-UI-Färbung.

## 🎨 Features

- **3 Theme-Modi**: Device (System), Light, Dark
- **Browser-UI Färbung**: Oberes UI wird automatisch eingefärbt (keine störenden Header/Footer)
- **PWA Manifest Switching**: Dynamischer Wechsel zwischen manifest-light und manifest-dark
- **Favicon Switching**: Automatischer Favicon-Wechsel zwischen Dark/Light
- **Auto-Update**: Keine PWA-Neuinstallation oder Cache-Löschung nötig
- **Reactive Signals**: Angular Signals für reaktive Theme-Updates
- **System Theme Detection**: Automatische Erkennung der System-Präferenz
- **Service Worker Sync**: Theme-Einstellungen werden mit SW synchronisiert

## 📁 Struktur

```
src/app/core/services/theme/
├── theme.service.ts           # Haupt-Theme-Service (Angular)
├── sw-update.service.ts       # Service Worker Update-Handling
├── theme-sw-extension.js      # Custom SW Extension für Theme-Messages
├── index.ts                   # Barrel Export
└── README.md                  # Diese Datei
```

## 🚀 Integration

### 1. Theme Service ist bereits integriert

Der Theme Service wird automatisch beim App-Start initialisiert (siehe `app.config.ts`).

### 2. Theme in Komponenten verwenden

#### Theme-State abfragen (Reactive):

```typescript
import { ThemeService } from '@core/services/theme';

export class MyComponent {
  private themeService = inject(ThemeService);

  // Reactive Signals
  currentTheme = this.themeService.currentTheme;             // 'device' | 'light' | 'dark'
  resolvedTheme = this.themeService.currentResolvedTheme;   // 'light' | 'dark'
}
```

#### Template Beispiel:

```html
<div>Aktuelles Theme: {{ currentTheme() }}</div>
<div>Aufgelöstes Theme: {{ resolvedTheme() }}</div>
```

### 3. Theme Toggle Button erstellen

```typescript
import { Component, inject } from '@angular/core';
import { ThemeService } from '@core/services/theme';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button (click)="toggleTheme()" class="theme-toggle">
      <img [src]="getThemeIcon()" alt="Theme Toggle" />
      <span>{{ getThemeLabel() }}</span>
    </button>
  `,
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  currentTheme = this.themeService.currentTheme;

  async toggleTheme(): Promise<void> {
    await this.themeService.toggleTheme();
  }

  getThemeIcon(): string {
    const theme = this.currentTheme();
    const icons = {
      device: '/img/theme/device.svg',
      light: '/img/theme/light-mode.svg',
      dark: '/img/theme/dark-mode.svg',
    };
    return icons[theme];
  }

  getThemeLabel(): string {
    const labels = {
      device: 'System',
      light: 'Hell',
      dark: 'Dunkel',
    };
    return labels[this.currentTheme()];
  }
}
```

### 4. Spezifisches Theme setzen

```typescript
// In einer Komponente oder Service
await this.themeService.setTheme('dark');    // Dark Theme
await this.themeService.setTheme('light');   // Light Theme
await this.themeService.setTheme('device');  // System Theme
```

## 🎨 CSS Variables

Alle Theme-Variablen sind in `src/styles/_variables.scss` definiert.

### Light Theme (Default):
```scss
:root {
  --background-color: #eceefe;
  --text-color: #000000;
  --primary-color: #444df2;
  // ... weitere Variablen
}
```

### Dark Theme Override:
```scss
:root[data-theme='dark'] {
  --background-color: #1a1d29;
  --text-color: #e4e4e7;
  --primary-color: #6b73ff;
  // ... weitere Variablen
}
```

### In Components verwenden:

```css
.my-element {
  background-color: var(--background-color);
  color: var(--text-color);
}
```

## 🔄 Auto-Update System

### Wie funktioniert es?

1. **Theme-Wechsel**: User wechselt Theme
2. **Manifest-Update**: Service lädt neues Manifest (mit Cache-Buster)
3. **SW-Sync**: Theme-Einstellungen werden an Service Worker geschickt
4. **Browser-UI**: `theme-color` Meta-Tag wird aktualisiert
5. **Kein Reload**: PWA muss NICHT neu installiert werden!

### Cache-Buster

Manifests werden mit Versionsparameter geladen:
```
/manifest-dark.webmanifest?v=1738761600
```

Die Version ist ein Unix-Timestamp (Sekunden), der bei jedem Theme-Wechsel neu generiert wird.

## 📱 PWA Manifests

### Light Theme
Datei: `public/manifest-light.webmanifest`
```json
{
  "background_color": "#ffffff",
  "theme_color": "#444df2",
  "icons": [
    { "src": "/theme-light/icon-192.png", ... }
  ]
}
```

### Dark Theme
Datei: `public/manifest-dark.webmanifest`
```json
{
  "background_color": "#1a1d29",
  "theme_color": "#1a1d29",
  "icons": [
    { "src": "/theme-dark/icon-192.png", ... }
  ]
}
```

## 🔧 Service Worker

### Angular Service Worker (ngsw)

Der Theme Service nutzt Angular's `@angular/service-worker` mit Custom Extension:

**Custom Messages:**
- `SYNC_THEME`: Theme-Einstellungen synchronisieren
- `GET_THEME`: Aktuelles Theme abrufen
- `FORCE_RELOAD_CLIENTS`: Alle Clients neu laden (optional)

### Theme SW Extension

Die Datei `theme-sw-extension.js` enthält Custom Message-Handler für Theme-Sync.

**Hinweis**: Diese Extension muss ggf. manuell in den Build-Prozess integriert werden, wenn erweiterte SW-Funktionalität benötigt wird.

## 🎯 Browser-UI Färbung

### Auth Pages & Dashboard

Das Theme System färbt automatisch das obere Browser-UI (Address Bar, Status Bar) basierend auf der `--background-color`:

```typescript
private updateThemeColorMeta(resolvedTheme: ResolvedTheme): void {
  // Liest --background-color aus CSS
  const color = this.getThemeColorFromCSS();
  metaThemeColor.setAttribute('content', color);
}
```

Da DABubble keine störenden Header/Footer hat, wird einfach die Body-Hintergrundfarbe verwendet.

## 📊 Theme Flow

```
User Click
    ↓
toggleTheme()
    ↓
setTheme(nextTheme)
    ↓
applyTheme(theme)
    ↓
┌─────────────────────────────────────┐
│ 1. Resolve Theme (device → system) │
│ 2. Update Signals                   │
│ 3. Store in localStorage            │
│ 4. Set data-theme Attribut          │
│ 5. Update Manifest & Favicon        │
│ 6. Update theme-color Meta          │
│ 7. Setup System Listener (wenn device) │
│ 8. Sync with Service Worker         │
└─────────────────────────────────────┘
```

## 🐛 Debugging

### Theme-State prüfen:

```javascript
// Browser Console
localStorage.getItem('dabubbleTheme')  // 'device' | 'light' | 'dark'
document.documentElement.getAttribute('data-theme')  // 'light' | 'dark'
```

### Service Worker Messages:

```javascript
// In Browser Console
navigator.serviceWorker.controller?.postMessage({
  type: 'GET_THEME'
});
```

### CSS Variable testen:

```javascript
getComputedStyle(document.documentElement).getPropertyValue('--background-color')
```

## 📝 TODO / Erweiterungen

- [ ] Theme Toggle UI Component erstellen (siehe Beispiel oben)
- [ ] Theme Icons in `public/img/theme/` ablegen
- [ ] Theme-Präferenz in User-Profil speichern (Firebase)
- [ ] Smooth Transitions zwischen Themes
- [ ] Theme-specific Bilder/Logos (data-theme-light/dark Attribute)
- [ ] Accessibility: prefers-reduced-motion berücksichtigen

## 🎓 Inspiration

Basierend auf dem Theme-System aus dem Join-MPA-Projekt:
- `/another-projects/join-mpa/js/shared/theme-service.js`
- `/another-projects/join-mpa/css/base/variables.css`

Adaptiert für Angular mit:
- TypeScript statt Vanilla JS
- Angular Signals statt DOM-Events
- Angular Service Worker statt Workbox
- Reactive Programming mit RxJS

---

**Erstellt**: 2026-02-05
**Version**: 1.0.0
**Autor**: DABubble Team
