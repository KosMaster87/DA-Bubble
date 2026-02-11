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
import { NavigationService } from '@core/services/navigation/navigation.service';
import { UserPresenceStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import { environment } from '../config/environments/env.dev';
import { LandscapeWarningComponent } from '@shared/components/landscape-warning/landscape-warning.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LandscapeWarningComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  protected readonly title = signal('dabubble');
  private firebaseService = inject(FirebaseService);
  private heartbeatService = inject(HeartbeatService);
  private navigationService = inject(NavigationService);
  private userPresenceStore = inject(UserPresenceStore);
  private authStore = inject(AuthStore);
  private presenceUnsubscribe?: () => void;

  constructor() {
    if (!environment.production) {
      console.log('🚀 DABubble App started!');
    }

    this.navigationService.handlePageReload();
    this.initializePresenceListener();
  }

  /**
   * Initialize user presence listener based on auth state
   * @description Sets up reactive effect to manage presence listener lifecycle
   */
  private initializePresenceListener(): void {
    effect(() => {
      const isLoggedIn = this.authStore.isLoggedIn();

      if (isLoggedIn) {
        this.startPresenceTracking();
      } else {
        this.stopPresenceTracking();
      }
    });
  }

  /**
   * Start presence tracking for logged-in user
   */
  private startPresenceTracking(): void {
    if (this.presenceUnsubscribe) {
      this.presenceUnsubscribe();
    }

    this.presenceUnsubscribe = this.userPresenceStore.startPresenceListener();
  }

  /**
   * Stop presence tracking and clear data
   */
  private stopPresenceTracking(): void {
    if (this.presenceUnsubscribe) {
      this.presenceUnsubscribe();
      this.presenceUnsubscribe = undefined;
    }

    this.userPresenceStore.clearOnlineUsers();
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
