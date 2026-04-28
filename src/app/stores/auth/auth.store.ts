/**
 * @fileoverview Authentication Store for DABubble Application
 * @description NgRx SignalStore for managing authentication state with Firebase Auth integration
 * @module AuthStore
 */

import { computed, inject } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { StoreCleanupService } from '@core/services/store-cleanup.service';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { createAuthStateHandlers } from './auth.helpers';
import { createLoginMethods } from './auth.login.methods';
import { createPasswordMethods } from './auth.password.methods';
import { createSignupMethods } from './auth.signup.methods';
import { initialAuthState } from './auth.types';

/**
 * Authentication store with Firebase integration
 * Provides methods for login, logout, registration and state management
 * @description Central auth facade that wires Firebase Auth events to NgRx signal state,
 * ensuring the rest of the app reacts to authentication changes through a single reactive source.
 * @constant {SignalStore}
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialAuthState),
  withComputed((store) => ({
    isLoggedIn: computed(() => store.isAuthenticated() && store.user() !== null),
    userDisplayName: computed(() => store.user()?.displayName || 'Anonymous'),
    userEmail: computed(() => store.user()?.email || ''),
    hasError: computed(() => store.error() !== null),
  })),
  withMethods((store) => {
    const auth = inject(Auth);
    const firestore = inject(Firestore);
    const storeCleanup = inject(StoreCleanupService);
    const handlers = createAuthStateHandlers(store, firestore, storeCleanup);

    onAuthStateChanged(auth, (firebaseUser) => {
      firebaseUser
        ? handlers.handleUserAuthenticated(firebaseUser)
        : handlers.handleUserLoggedOut();
    });

    const loginMethods = createLoginMethods(
      auth,
      firestore,
      store,
      handlers.handleSuccessfulAuth,
      handlers.handleAuthError,
    );
    const signupMethods = createSignupMethods(
      auth,
      firestore,
      store,
      handlers.handleSuccessfulAuth,
      handlers.handleAuthError,
    );
    const passwordMethods = createPasswordMethods(auth);

    return {
      ...loginMethods,
      ...signupMethods,
      ...passwordMethods,

      setLoading(isLoading: boolean) {
        patchState(store, { isLoading });
      },

      setError(error: string | null) {
        patchState(store, { error });
      },

      clearError() {
        patchState(store, { error: null });
      },
    };
  }),
);
