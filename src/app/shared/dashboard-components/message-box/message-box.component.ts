/**
 * @fileoverview Message Box Component
 * @description Reusable message input box with emoji, mention, and send functionality
 * @module shared/dashboard-components/message-box
 */

import { Component, output, signal, input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserSelectionComponent } from '../user-selection/user-selection.component';
import { UserListItem } from '../user-list-item/user-list-item.component';
import { ReactionBarComponent, ReactionType } from '../reaction-bar/reaction-bar.component';

@Component({
  selector: 'app-message-box',
  imports: [FormsModule, UserSelectionComponent, ReactionBarComponent],
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.scss',
})
export class MessageBoxComponent {
  users = input<UserListItem[]>([]);
  messageSent = output<string>();
  protected message = '';
  protected isEmojiPickerOpen = signal<boolean>(false);
  protected isUserSelectionOpen = signal<boolean>(false);
  protected selectedUsers = signal<UserListItem[]>([]);
  protected userSearchValue = signal<string>('');

  /**
   * Available users that are NOT yet selected
   */
  availableUsers = computed<UserListItem[]>(() => {
    const selectedIds = this.selectedUsers().map((u) => u.id);
    return this.users().filter((user) => !selectedIds.includes(user.id));
  });

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
    if (this.isEmojiPickerOpen()) {
      this.isUserSelectionOpen.set(false);
    }
  }

  /**
   * Handle emoji reaction selection
   */
  onEmojiReaction(reaction: ReactionType): void {
    // Insert emoji at cursor position or append to message
    const emojiMap: Record<string, string> = {
      'thumbs-up': '👍',
      'checked': '✅',
      'rocket': '🚀',
      'nerd-face': '🤓',
    };
    const emoji = emojiMap[reaction] || reaction;
    this.message += emoji;
    this.isEmojiPickerOpen.set(false);
  }

  /**
   * Handle mention picker
   */
  openMentionPicker(): void {
    this.isUserSelectionOpen.update((v) => !v);
    if (this.isUserSelectionOpen()) {
      this.isEmojiPickerOpen.set(false);
    }
  }

  /**
   * Handle user selection
   */
  onUserSelected(user: UserListItem): void {
    this.selectedUsers.update((users) => [...users, user]);
    this.message += `@${user.name} `;
    this.isUserSelectionOpen.set(false);
  }

  /**
   * Close user selection
   */
  onUserSelectionClosed(): void {
    this.isUserSelectionOpen.set(false);
  }
}
