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
  /**
   * List of available channels
   */
  channels = input<ChannelListItem[]>([]);

  /**
   * Search value for filtering
   */
  searchValue = input<string>('');

  /**
   * Event when a channel is selected
   */
  channelSelected = output<ChannelListItem>();

  /**
   * Event when closed (click outside)
   */
  closed = output<void>();

  /**
   * Filtered channels based on search
   */
  filteredChannels = computed(() => {
    const search = this.searchValue().toLowerCase();
    if (!search) {
      return this.channels();
    }
    return this.channels().filter((channel) => channel.name.toLowerCase().includes(search));
  });

  /**
   * Handle channel selection
   */
  onChannelClick(channelId: string): void {
    const channel = this.channels().find((c) => c.id === channelId);
    if (channel) {
      this.channelSelected.emit(channel);
    }
  }

  /**
   * Handle overlay click
   */
  onOverlayClick(): void {
    this.closed.emit();
  }
}
