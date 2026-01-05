/**
 * @fileoverview Application configuration for DABubble.
 * @description This file contains the main application configuration for the DABubble app.
 * It sets up routing, error handling, integrates Firebase services including
 * Firestore, Authentication and Storage.
 * @module AppConfig
 */

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { DashboardReuseStrategy } from './core/strategies/dashboard-reuse.strategy';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { environment } from './../config/environments/env.dev';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimations(),

    // Custom route reuse strategy to keep Dashboard alive
    { provide: RouteReuseStrategy, useClass: DashboardReuseStrategy },

    // Firebase services
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()), // Firestore Database
    provideStorage(() => getStorage()),
  ],
};
