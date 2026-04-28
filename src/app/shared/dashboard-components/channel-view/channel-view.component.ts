/**
 * @fileoverview Channel View Component
 * @description Popup for viewing channel information and joining channels
 * @module shared/dashboard-components/channel-view
 */

import { Component, computed, inject, input, output } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/channels/channel.store';

export interface ChannelViewData {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  memberIds: string[];
  isPrivate: boolean;
}

@Component({
  selector: 'app-channel-view',
  standalone: true,
  imports: [],
  templateUrl: './channel-view.component.html',
  styleUrl: './channel-view.component.scss',
})
export class ChannelViewComponent {
  private channelStore = inject(ChannelStore);
  private authStore = inject(AuthStore);

  channelId = input.required<string>();
  isVisible = input<boolean>(false);

  closeClicked = output<void>();
  joinClicked = output<string>(); // Emits channel ID to join
  navigateClicked = output<string>(); // Emits channel ID to navigate to

  /**
   * Get channel data from store
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  protected channel = computed(() => {
    const id = this.channelId();
    return this.channelStore.getChannelById()(id);
  });

  /**
   * Check if current user is member of this channel
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  protected isMember = computed(() => {
    const channel = this.channel();
    const currentUserId = this.authStore.user()?.uid;
    if (!channel || !currentUserId) return false;
    return channel.members.includes(currentUserId);
  });

  /**
   * Get member count
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  protected memberCount = computed(() => {
    const channel = this.channel();
    return channel?.members.length || 0;
  });

  /**
   * Handle close button click
   * @description Emits close intent for parent-level channel-view dismissal handling.
   * @returns {void}
   */
  onClose = (): void => {
    this.closeClicked.emit();
  };

  /**
   * Handle join channel button click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @returns {void}
   */
  onJoin = (): void => {
    const id = this.channelId();
    if (id) {
      this.joinClicked.emit(id);
    }
  };

  /**
   * Handle navigate to channel button click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @returns {void}
   */
  onNavigate = (): void => {
    const id = this.channelId();
    if (id) {
      this.navigateClicked.emit(id);
    }
  };
}
