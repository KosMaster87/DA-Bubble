/**
 * @fileoverview Workspace Data Loader Service
 * @description Handles loading of workspace data from stores
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
   */
  loadWorkspaceData(): void {
    this.channelStore.loadChannels();
    this.userStore.loadUsers();
  }

  /**
   * Load only channels
   */
  loadChannels(): void {
    this.channelStore.loadChannels();
  }

  /**
   * Load only users
   */
  loadUsers(): void {
    this.userStore.loadUsers();
  }
}
