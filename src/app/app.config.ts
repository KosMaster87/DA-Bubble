/**
 * @fileoverview Application configuration for DABubble.
 * @description This file contains the main application configuration for the DABubble app.
 * It sets up routing, error handling, integrates Firebase services including
 * Firestore, Authentication and Storage, and initializes the theme system.
 * @module AppConfig
 */

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  APP_INITIALIZER,
  isDevMode,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { DashboardReuseStrategy } from './core/strategies/dashboard-reuse.strategy';
import { ThemeService } from './core/services/theme/theme.service';
import { SwUpdateService } from './core/services/theme/sw-update.service';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { environment } from './../config/environments/env.dev';

/**
 * Initialize theme service on app startup
 */
function initializeTheme(themeService: ThemeService): () => Promise<void> {
  return () => themeService.initTheme();
}

/**
 * Initialize service worker update service
 */
function initializeSwUpdate(swUpdateService: SwUpdateService): () => void {
  return () => swUpdateService.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimations(),

    // Service Worker for PWA support
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    // Initialize theme system on app startup
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTheme,
      deps: [ThemeService],
      multi: true,
    },

    // Initialize SW update service
    {
      provide: APP_INITIALIZER,
      useFactory: initializeSwUpdate,
      deps: [SwUpdateService],
      multi: true,
    },

    // Custom route reuse strategy to keep Dashboard alive
    { provide: RouteReuseStrategy, useClass: DashboardReuseStrategy },

    // Firebase services
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()), // Firestore Database
    provideStorage(() => getStorage()),
  ],
};
