/**
 * @fileoverview Message Selection Component
 * @description Popup to select from message search results
 * @module shared/dashboard-components/message-selection
 */

import { Component, input, output } from '@angular/core';
import {
  MessageSearchItemComponent,
  MessageSearchItem,
} from '../message-search-item/message-search-item.component';

@Component({
  selector: 'app-message-selection',
  imports: [MessageSearchItemComponent],
  templateUrl: './message-selection.component.html',
  styleUrl: './message-selection.component.scss',
})
export class MessageSelectionComponent {
  messages = input<MessageSearchItem[]>([]);
  messageSelected = output<MessageSearchItem>();
  closed = output<void>();

  /**
   * Handle message selection
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Finds message by ID and emits selection event
   * @param {string} messageId - ID of the selected message
   * @returns {void}
   */
  protected onMessageClick = (messageId: string): void => {
    const message = this.messages().find((m) => m.id === messageId);
    if (message) {
      this.messageSelected.emit(message);
    }
  };

  /**
   * Handle overlay click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Closes the selection popup
   * @returns {void}
   */
  protected onOverlayClick = (): void => {
    this.closed.emit();
  };
}
