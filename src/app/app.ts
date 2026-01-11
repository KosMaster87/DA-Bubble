/**
 * @fileoverview Root component for the DABubble application.
 * @description This component serves as the main entry point for the application,
 * incorporating routing and global styles.
 * @module AppComponent
 */

import { Component, signal, inject, OnDestroy, effect } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { FirebaseService } from '@core/services/firebase/firebase.service';
import { HeartbeatService } from '@core/services/heartbeat/heartbeat.service';
import { UserPresenceStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import { environment } from '../config/environments/env.dev';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  protected readonly title = signal('dabubble');
  private firebaseService = inject(FirebaseService);
  private heartbeatService = inject(HeartbeatService);
  private userPresenceStore = inject(UserPresenceStore);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private presenceUnsubscribe?: () => void;

  constructor() {
    if (!environment.production) {
      console.log('🚀 DABubble App started!');
    }

    // Handle page reload: Navigate to /dashboard on browser reload (F5)
    // This runs only ONCE when app starts, not on every navigation
    this.handlePageReload();

    /**
     * Reactive effect that manages user presence listener lifecycle
     * @description Automatically starts/stops the Firestore presence listener based on authentication state
     * - On login: Stops any existing listener, starts a new one, and loads online users
     * - On logout: Stops the listener and clears online user data
     */
    effect(() => {
      const isLoggedIn = this.authStore.isLoggedIn();

      if (isLoggedIn) {
        if (this.presenceUnsubscribe) {
          this.presenceUnsubscribe();
        }

        this.presenceUnsubscribe = this.userPresenceStore.startPresenceListener();
        this.userPresenceStore.loadOnlineUsers();
      } else {
        if (this.presenceUnsubscribe) {
          this.presenceUnsubscribe();
          this.presenceUnsubscribe = undefined;
        }

        this.userPresenceStore.clearOnlineUsers();
      }
    });
  }

  /**
   * Handle page reload: Navigate to /dashboard on browser reload (F5)
   * This runs only ONCE when app component is created (app start)
   */
  private handlePageReload(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation?.type === 'reload') {
      const currentUrl = this.router.url;
      // Only navigate if we're not already on /dashboard
      if (currentUrl !== '/dashboard' && !currentUrl.startsWith('/dashboard?')) {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
    }
  }

  /**
   * Lifecycle hook called when component is destroyed
   * @description Cleans up the presence listener subscription to prevent memory leaks
   */
  ngOnDestroy() {
    if (this.presenceUnsubscribe) {
      this.presenceUnsubscribe();
    }
  }
}
