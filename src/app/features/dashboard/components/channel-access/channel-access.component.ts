/**
 * @fileoverview Channel Access Component
 * @description Shows access denied message for private channels or welcome screen for public channels
 * @module features/dashboard/components/channel-access
 */

import { Component, input, output, inject, computed } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/channel.store';

interface ChannelAccessInfo {
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  description?: string;
  rules?: string[];
}

@Component({
  selector: 'app-channel-access',
  imports: [],
  templateUrl: './channel-access.component.html',
  styleUrl: './channel-access.component.scss',
})
export class ChannelAccessComponent {
  protected authStore = inject(AuthStore);
  protected channelStore = inject(ChannelStore);

  /**
   * Channel information
   */
  channelInfo = input.required<ChannelAccessInfo>();

  /**
   * Output when user accepts and enters channel
   */
  channelAccepted = output<string>();

  /**
   * Check if user is already a member
   */
  protected isMember = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) return false;

    const channel = this.channelStore.getChannelById()(this.channelInfo().channelId);
    if (!channel) return false;

    return channel.members.includes(currentUser.uid);
  });

  /**
   * Accept and join public channel
   */
  acceptAndJoin(): void {
    const currentUser = this.authStore.user();
    const channelId = this.channelInfo().channelId;

    if (!currentUser) {
      console.error('❌ No current user');
      return;
    }

    // Emit event - parent will handle adding user to members and hiding this screen
    this.channelAccepted.emit(channelId);
    console.log('✅ User accepted public channel:', channelId);
  }
}
