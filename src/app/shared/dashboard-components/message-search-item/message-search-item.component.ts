/**
 * @fileoverview Message Search Item Component
 * @description Component for displaying message search results
 * @module shared/dashboard-components/message-search-item
 */

import { Component, input, output } from '@angular/core';

export interface MessageSearchItem {
  id: string;
  displayName: string;
  description: string;
  type: 'channel' | 'dm';
}

@Component({
  selector: 'app-message-search-item',
  imports: [],
  templateUrl: './message-search-item.component.html',
  styleUrl: './message-search-item.component.scss',
})
export class MessageSearchItemComponent {
  item = input.required<MessageSearchItem>();
  isActive = input<boolean>(false);
  itemClicked = output<string>();

  /**
   * Handle click event
   */
  onClick(): void {
    this.itemClicked.emit(this.item().id);
  }
}
