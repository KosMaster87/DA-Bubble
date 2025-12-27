/**
 * @fileoverview Channel List Item Component
 * @description Reusable component for displaying channel items with icon and name
 * @module shared/dashboard-components/channel-list-item
 */

import { Component, input, output } from '@angular/core';

export interface ChannelListItem {
  id: string;
  name: string;
}

@Component({
  selector: 'app-channel-list-item',
  imports: [],
  templateUrl: './channel-list-item.component.html',
  styleUrl: './channel-list-item.component.scss',
})
export class ChannelListItemComponent {
  channel = input.required<ChannelListItem>();
  isActive = input<boolean>(false);
  itemClicked = output<string>();

  /**
   * Handle click event
   */
  onClick(): void {
    this.itemClicked.emit(this.channel().id);
  }
}
