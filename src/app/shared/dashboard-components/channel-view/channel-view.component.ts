/**
 * @fileoverview Channel View Component
 * @description Popup for viewing channel information and joining channels
 * @module shared/dashboard-components/channel-view
 */

import { Component, input, output, computed, inject } from '@angular/core';
import { ChannelStore } from '@stores/channels/channel.store';
import { AuthStore } from '@stores/auth';

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
   */
  protected channel = computed(() => {
    const id = this.channelId();
    return this.channelStore.getChannelById()(id);
  });

  /**
   * Check if current user is member of this channel
   */
  protected isMember = computed(() => {
    const channel = this.channel();
    const currentUserId = this.authStore.user()?.uid;
    if (!channel || !currentUserId) return false;
    return channel.members.includes(currentUserId);
  });

  /**
   * Get member count
   */
  protected memberCount = computed(() => {
    const channel = this.channel();
    return channel?.members.length || 0;
  });

  /**
   * Handle close button click
   * @returns {void}
   */
  onClose = (): void => {
    this.closeClicked.emit();
  };

  /**
   * Handle join channel button click
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
   * @returns {void}
   */
  onNavigate = (): void => {
    const id = this.channelId();
    if (id) {
      this.navigateClicked.emit(id);
    }
  };
}
