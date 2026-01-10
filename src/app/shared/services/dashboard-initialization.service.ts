/**
 * @fileoverview Dashboard Initialization Service
 * @description Handles dashboard initialization effects like message loading
 * @module shared/services/dashboard-initialization
 */

import { Injectable, inject, effect, computed } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/channel.store';
import { ChannelMessageStore } from '@stores/channel-message.store';
import { DirectMessageStore } from '@stores/direct-message.store';

/**
 * Service for managing dashboard initialization and message loading effects
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardInitializationService {
  private authStore = inject(AuthStore);
  private channelStore = inject(ChannelStore);
  private channelMessageStore = inject(ChannelMessageStore);
  private directMessageStore = inject(DirectMessageStore);

  // Computed to track only directMessages changes
  private userDirectMessages = computed(() => {
    const user = this.authStore.user();
    return user?.directMessages || [];
  });

  /**
   * Initialize dashboard effects
   * Should be called in component constructor
   */
  initializeEffects(): void {
    // Load messages for all channels where user is a member (for thread-unread detection)
    effect(() => {
      const currentUser = this.authStore.user();
      if (!currentUser) return;

      const channels = this.channelStore.channels();
      const memberChannels = channels.filter((channel) =>
        channel.members.includes(currentUser.uid)
      );

      memberChannels.forEach((channel) => {
        this.channelMessageStore.loadChannelMessages(channel.id);
      });
    });

    // Watch for changes in user's directMessages array (only when IDs actually change)
    effect(() => {
      const directMessages = this.userDirectMessages();
      if (directMessages.length > 0) {
        this.directMessageStore.loadConversations(directMessages);
      }
    });

    // Load messages for all DM conversations to enable thread-unread detection
    effect(() => {
      const conversations = this.directMessageStore.conversations();
      conversations.forEach((conversation) => {
        this.directMessageStore.loadMessages(conversation.id);
      });
    });
  }
}
