/**
 * @fileoverview Message Box Component
 * @description Reusable message input box with emoji, mention, and send functionality
 * @module shared/dashboard-components/message-box
 */

import { Component, output, signal, input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserSelectionComponent } from '../user-selection/user-selection.component';
import { UserListItem } from '../user-list-item/user-list-item.component';
import { ChannelSelectionComponent } from '../channel-selection/channel-selection.component';
import { ChannelListItem } from '../channel-list-item/channel-list-item.component';
import { ReactionBarComponent, ReactionType } from '../reaction-bar/reaction-bar.component';
import { MessageSelectionComponent } from '../message-selection/message-selection.component';
import { MessageSearchItem } from '../message-search-item/message-search-item.component';

@Component({
  selector: 'app-message-box',
  imports: [
    FormsModule,
    UserSelectionComponent,
    ChannelSelectionComponent,
    ReactionBarComponent,
    MessageSelectionComponent,
  ],
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.scss',
})
export class MessageBoxComponent {
  users = input<UserListItem[]>([]);
  channels = input<ChannelListItem[]>([]);
  messages = input<MessageSearchItem[]>([]);
  messageSent = output<string>();
  messageSelected = output<string>(); // Emits message ID to scroll to
  protected message = signal('');
  protected isEmojiPickerOpen = signal<boolean>(false);
  protected isUserSelectionOpen = signal<boolean>(false);
  protected isChannelSelectionOpen = signal<boolean>(false);
  protected isMessageSearchOpen = signal<boolean>(false);
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
   * Get search prefix from message input
   */
  protected searchPrefix = computed(() => {
    const msg = this.message().trim();
    if (msg.startsWith('$')) return '$';
    if (msg.startsWith('@')) return '@';
    if (msg.startsWith('#')) return '#';
    return '';
  });

  /**
   * Get search term without prefix
   */
  protected searchTerm = computed(() => {
    const prefix = this.searchPrefix();
    if (!prefix) return '';
    return this.message().substring(1).toLowerCase().trim();
  });

  /**
   * Filtered messages based on $ search
   */
  protected filteredMessages = computed<MessageSearchItem[]>(() => {
    if (this.searchPrefix() !== '$') return [];
    const term = this.searchTerm();
    if (term.length < 3) return [];

    return this.messages()
      .filter((msg) => msg.description.toLowerCase().includes(term))
      .slice(0, 5); // Top 5 results
  });

  /**
   * Filtered channels based on # search
   */
  protected filteredChannels = computed<ChannelListItem[]>(() => {
    if (this.searchPrefix() !== '#') return [];
    const term = this.searchTerm();

    if (!term) return this.channels();

    return this.channels().filter((channel) => channel.name.toLowerCase().includes(term));
  });

  /**
   * Show message search popup when $ prefix is used
   */
  protected showMessageSearch = computed(() => {
    return (
      this.isMessageSearchOpen() &&
      this.searchPrefix() === '$' &&
      this.filteredMessages().length > 0
    );
  });

  /**
   * Show channel selection popup when # prefix is used
   */
  protected showChannelSelection = computed(() => {
    return (
      this.isChannelSelectionOpen() &&
      this.searchPrefix() === '#'
    );
  });

  /**
   * Send message
   */
  sendMessage(): void {
    if (this.message().trim()) {
      this.messageSent.emit(this.message());
      this.message.set('');
      this.isMessageSearchOpen.set(false);
      this.isUserSelectionOpen.set(false);
    }
  }

  /**
   * Handle message input change to detect search prefix
   */
  onMessageInput(): void {
    const prefix = this.searchPrefix();
    const term = this.searchTerm();
    const msg = this.message().trim();

    // Close all if message is empty
    if (!msg) {
      this.isUserSelectionOpen.set(false);
      this.isChannelSelectionOpen.set(false);
      this.isMessageSearchOpen.set(false);
      return;
    }

    // Handle $ prefix for message search
    if (prefix === '$') {
      if (term.length >= 3) {
        this.isMessageSearchOpen.set(true);
        this.isUserSelectionOpen.set(false);
        this.isChannelSelectionOpen.set(false);
        this.isEmojiPickerOpen.set(false);
      } else {
        this.isMessageSearchOpen.set(false);
      }
    }
    // Handle @ prefix for user mentions
    else if (prefix === '@') {
      this.isUserSelectionOpen.set(true);
      this.isChannelSelectionOpen.set(false);
      this.isMessageSearchOpen.set(false);
      this.isEmojiPickerOpen.set(false);
      this.userSearchValue.set(term);
    }
    // Handle # prefix for channel mentions
    else if (prefix === '#') {
      this.isChannelSelectionOpen.set(true);
      this.isUserSelectionOpen.set(false);
      this.isMessageSearchOpen.set(false);
      this.isEmojiPickerOpen.set(false);
    }
    // No prefix - close all search popups
    else {
      this.isUserSelectionOpen.set(false);
      this.isChannelSelectionOpen.set(false);
      this.isMessageSearchOpen.set(false);
    }
  }

  /**
   * Handle emoji picker (placeholder)
   */
  openEmojiPicker(): void {
    this.isEmojiPickerOpen.update((v) => !v);
    if (this.isEmojiPickerOpen()) {
      this.isUserSelectionOpen.set(false);
      this.isChannelSelectionOpen.set(false);
      this.isMessageSearchOpen.set(false);
    }
  }

  /**
   * Handle emoji reaction selection
   */
  onEmojiReaction(reaction: ReactionType): void {
    // Insert emoji at cursor position or append to message
    const emojiMap: Record<string, string> = {
      'thumbs-up': '👍',
      checked: '✅',
      rocket: '🚀',
      'nerd-face': '🤓',
    };
    const emoji = emojiMap[reaction] || reaction;
    this.message.set(this.message() + emoji);
    this.isEmojiPickerOpen.set(false);
  }

  /**
   * Handle mention picker
   */
  openMentionPicker(): void {
    this.isUserSelectionOpen.update((v) => !v);
    if (this.isUserSelectionOpen()) {
      this.isEmojiPickerOpen.set(false);
      this.isChannelSelectionOpen.set(false);
      this.isMessageSearchOpen.set(false);
    }
  }

  /**
   * Handle user selection
   */
  onUserSelected(user: UserListItem): void {
    this.selectedUsers.update((users) => [...users, user]);
    // Replace the @ prefix and search term with the mention
    const currentMessage = this.message();
    const prefix = this.searchPrefix();

    if (prefix === '@') {
      // Remove the @ and search term, then add the full mention
      this.message.set(`@${user.name} `);
    } else {
      // Fallback: just append if no prefix (shouldn't happen)
      this.message.set(currentMessage + `@${user.name} `);
    }

    this.isUserSelectionOpen.set(false);
  }

  /**
   * Handle channel selection
   */
  onChannelSelected(channel: ChannelListItem): void {
    // Replace the # prefix and search term with the channel mention
    const prefix = this.searchPrefix();

    if (prefix === '#') {
      // Remove the # and search term, then add the full channel mention
      this.message.set(`#${channel.name} `);
    } else {
      // Fallback: just append if no prefix (shouldn't happen)
      this.message.set(this.message() + `#${channel.name} `);
    }

    this.isChannelSelectionOpen.set(false);
  }

  /**
   * Close user selection
   */
  onUserSelectionClosed(): void {
    this.isUserSelectionOpen.set(false);
  }

  /**
   * Close channel selection
   */
  onChannelSelectionClosed(): void {
    this.isChannelSelectionOpen.set(false);
  }

  /**
   * Handle message search result selection
   */
  onMessageResultSelected(message: MessageSearchItem): void {
    this.isMessageSearchOpen.set(false);
    this.message.set('');
    // Emit message ID to parent component to scroll to that message
    this.messageSelected.emit(message.id);
  }

  /**
   * Close message search
   */
  onMessageSearchClosed(): void {
    this.isMessageSearchOpen.set(false);
  }
}
