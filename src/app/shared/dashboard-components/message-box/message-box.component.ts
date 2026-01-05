/**
 * @fileoverview Message Box Component
 * @description Reusable message input box with emoji, mention, and send functionality
 * @module shared/dashboard-components/message-box
 */

import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-message-box',
  imports: [FormsModule],
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.scss',
})
export class MessageBoxComponent {
  messageSent = output<string>();
  protected message = '';
  protected isEmojiPickerOpen = signal<boolean>(false);
  protected isMentionPickerOpen = signal<boolean>(false);

  /**
   * Send message
   */
  sendMessage(): void {
    if (this.message.trim()) {
      this.messageSent.emit(this.message);
      this.message = '';
    }
  }

  /**
   * Handle emoji picker (placeholder)
   */
  openEmojiPicker(): void {
    this.isEmojiPickerOpen.update((v) => !v);
  }

  /**
   * Handle mention picker (placeholder)
   */
  openMentionPicker(): void {
    this.isMentionPickerOpen.update((v) => !v);
  }
}
