/**
 * @fileoverview Workspace Data Loader Service
 * @description Coordinates initial workspace data hydration from stores so dashboard bootstrapping follows one predictable sequence.
 * @module core/services/workspace-initialization
 */

import { Injectable, inject } from '@angular/core';
import { ChannelStore, UserStore } from '@stores/index';

/**
 * Service for loading workspace data
 */
@Injectable({
  providedIn: 'root',
})
export class WorkspaceDataLoaderService {
  private channelStore = inject(ChannelStore);
  private userStore = inject(UserStore);

  /**
   * Load all workspace data (channels and users)
   * @description Single entry point for bootstrapping store data so initialization orchestrators don't need to know which stores to trigger.
   */
  loadWorkspaceData(): void {
    this.channelStore.loadChannels();
    this.userStore.loadUsers();
  }

  /**
   * Load only channels
   * @description Granular loader used when only channel data needs refreshing without re-fetching users.
   */
  loadChannels(): void {
    this.channelStore.loadChannels();
  }

  /**
   * Load only users
   * @description Granular loader used when only user data needs refreshing without re-fetching channels.
   */
  loadUsers(): void {
    this.userStore.loadUsers();
  }
}
