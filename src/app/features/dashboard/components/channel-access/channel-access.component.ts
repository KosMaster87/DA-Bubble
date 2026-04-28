/**
 * @fileoverview Channel Access Component
 * @description Shows access denied message for private channels or welcome screen for public channels
 * @module features/dashboard/components/channel-access
 */

import { Component, computed, inject, input, output } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/channels/channel.store';

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
    * @description Receives the access context as input so this component stays purely presentational and reusable across channel entry points.
   */
  channelInfo = input.required<ChannelAccessInfo>();

  /**
   * Output when user accepts and enters channel
    * @description Emits intent instead of mutating stores directly so membership changes remain orchestrated by parent-level handlers.
   */
  channelAccepted = output<string>();

  /**
   * Check if user is already a member
    * @description Derives membership from auth and channel store state to render access actions based on authoritative data.
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
    * @description Validates authentication locally and forwards a join intent so parent flows can handle navigation and side effects centrally.
   */
  protected acceptAndJoin = (): void => {
    const currentUser = this.authStore.user();
    const channelId = this.channelInfo().channelId;

    if (!currentUser) {
      console.error('❌ No current user');
      return;
    }

    this.channelAccepted.emit(channelId);
    console.log('✅ User accepted public channel:', channelId);
  };
}
