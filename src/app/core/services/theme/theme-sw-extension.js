/**
 * @fileoverview Custom Service Worker Extension for Theme Handling
 * @description Extends Angular's ngsw-worker with theme sync capabilities
 * @module theme-sw-extension
 *
 * This file extends the Angular Service Worker to handle theme-related messages.
 * To use this, it needs to be injected into the ngsw-worker.js build output.
 */

// Theme settings storage in Service Worker scope
let themeSettings = {
  dabubbleTheme: 'device',
  resolvedTheme: 'light',
};

/**
 * Handle incoming messages from the application
 */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  switch (type) {
    case 'SYNC_THEME':
      handleThemeSync(payload);
      break;

    case 'GET_THEME':
      sendThemeToClient(event.source);
      break;

    case 'FORCE_RELOAD_CLIENTS':
      forceReloadAllClients();
      break;

    default:
      // Let Angular SW handle other messages
      break;
  }
});

/**
 * Handle theme synchronization
 * @param {Object} payload - Theme settings payload
 */
function handleThemeSync(payload) {
  if (payload && payload.dabubbleTheme) {
    themeSettings = {
      dabubbleTheme: payload.dabubbleTheme,
      resolvedTheme: payload.resolvedTheme || 'light',
    };
    console.log('[SW Theme] Settings synchronized:', themeSettings);
  }
}

/**
 * Send current theme settings to a client
 * @param {Client} client - The client to send the theme to
 */
function sendThemeToClient(client) {
  if (client) {
    client.postMessage({
      type: 'THEME_DATA',
      payload: themeSettings,
    });
  }
}

/**
 * Force reload all clients (for critical updates)
 */
async function forceReloadAllClients() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({
      type: 'FORCE_RELOAD',
    });
  });
}

/**
 * Cache versioning for theme assets
 * This ensures that theme changes trigger proper cache updates
 */
const THEME_CACHE_VERSION = 'dabubble-theme-v1';

/**
 * Install event - setup theme cache
 */
self.addEventListener('install', (event) => {
  console.log('[SW Theme] Installing theme extension');
  self.skipWaiting(); // Activate immediately
});

/**
 * Activate event - cleanup old theme caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW Theme] Activating theme extension');
  event.waitUntil(
    (async () => {
      // Clean up old theme caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('dabubble-theme-') && name !== THEME_CACHE_VERSION)
          .map((name) => caches.delete(name)),
      );

      // Take control of all clients immediately
      await self.clients.claim();
    })(),
  );
});

console.log('[SW Theme] Extension loaded');
