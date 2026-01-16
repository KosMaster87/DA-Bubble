/**
 * @fileoverview Chat New Msg Component
 * @description Component for composing new messages with search and message box
 * @module features/dashboard/components/chat-new-msg
 */

import { Component, output, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { UserStore } from '@stores/user.store';
import { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';

@Component({
  selector: 'app-chat-new-msg',
  imports: [FormsModule, MessageBoxComponent],
  templateUrl: './chat-new-msg.component.html',
  styleUrl: './chat-new-msg.component.scss',
})
export class ChatNewMsgComponent {
  private userStore = inject(UserStore);
  backRequested = output<void>(); // For mobile back navigation

  protected searchQuery = '';

  /**
   * All workspace users for message-box mentions
   */
  protected allUsers = computed<UserListItem[]>(() => {
    return this.userStore.users().map(user => ({
      id: user.uid,
      name: user.displayName,
      avatar: user.photoURL || '',
    }));
  });

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
