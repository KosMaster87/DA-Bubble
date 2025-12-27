/**
 * @fileoverview Chat New Msg Component
 * @description Component for composing new messages with search and message box
 * @module features/dashboard/components/chat-new-msg
 */

import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';

@Component({
  selector: 'app-chat-new-msg',
  imports: [FormsModule, MessageBoxComponent],
  templateUrl: './chat-new-msg.component.html',
  styleUrl: './chat-new-msg.component.scss',
})
export class ChatNewMsgComponent {
  protected searchQuery = '';

  /**
   * Handle message send
   */
  onMessageSent(message: string): void {
    console.log('Message sent:', message);
    // TODO: Implement message sending logic
  }

  /**
   * Handle search
   */
  onSearch(): void {
    console.log('Search for:', this.searchQuery);
    // TODO: Implement recipient search
  }
}
