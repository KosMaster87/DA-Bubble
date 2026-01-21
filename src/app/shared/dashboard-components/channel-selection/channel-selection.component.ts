/**
 * @fileoverview Channel Selection Component
 * @description Popup to select a channel from the workspace
 * @module shared/dashboard-components/channel-selection
 */

import { Component, input, output, computed } from '@angular/core';
import {
  ChannelListItemComponent,
  ChannelListItem,
} from '../channel-list-item/channel-list-item.component';

@Component({
  selector: 'app-channel-selection',
  imports: [ChannelListItemComponent],
  templateUrl: './channel-selection.component.html',
  styleUrl: './channel-selection.component.scss',
})
export class ChannelSelectionComponent {
  channels = input<ChannelListItem[]>([]);
  searchValue = input<string>('');
  channelSelected = output<ChannelListItem>();
  closed = output<void>();

  /**
   * Filtered channels based on search
   */
  filteredChannels = computed(() => {
    const search = this.searchValue().toLowerCase();
    const excludedChannels = ['dabubble-welcome', "let's bubble channels"];

    let filtered = this.channels().filter(
      (channel) => !excludedChannels.includes(channel.name.toLowerCase())
    );

    if (search) {
      filtered = filtered.filter((channel) => channel.name.toLowerCase().includes(search));
    }

    return filtered;
  });

  /**
   * Handle channel selection
   * @param {string} channelId - Channel ID to select
   * @returns {void}
   */
  onChannelClick = (channelId: string): void => {
    const channel = this.channels().find((c) => c.id === channelId);
    if (channel) {
      this.channelSelected.emit(channel);
    }
  };

  /**
   * Handle overlay click
   * @returns {void}
   */
  onOverlayClick = (): void => {
    this.closed.emit();
  };
}
