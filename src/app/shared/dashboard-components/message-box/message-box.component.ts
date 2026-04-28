/**
 * @fileoverview Message Box Component
 * @description Reusable message input box with emoji, mention, and send functionality
 * @module shared/dashboard-components/message-box
 */

import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MessageBoxStateService,
  MessageComposerService,
  MessageSearchService,
} from '../../services';
import { ChannelListItem } from '../channel-list-item/channel-list-item.component';
import { ChannelSelectionComponent } from '../channel-selection/channel-selection.component';
import { MentionChipComponent, MentionChipData } from '../mention-chip/mention-chip.component';
import { MessageSearchItem } from '../message-search-item/message-search-item.component';
import { MessageSelectionComponent } from '../message-selection/message-selection.component';
import { ReactionBarComponent, ReactionType } from '../reaction-bar/reaction-bar.component';
import { UserListItem } from '../user-list-item/user-list-item.component';
import { UserSelectionComponent } from '../user-selection/user-selection.component';

@Component({
  selector: 'app-message-box',
  imports: [
    FormsModule,
    UserSelectionComponent,
    ChannelSelectionComponent,
    ReactionBarComponent,
    MessageSelectionComponent,
    MentionChipComponent,
  ],
  providers: [MessageBoxStateService, MessageComposerService, MessageSearchService],
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.scss',
})
export class MessageBoxComponent {
  users = input<UserListItem[]>([]);
  channels = input<ChannelListItem[]>([]);
  messages = input<MessageSearchItem[]>([]);
  messageSent = output<string>();
  messageSelected = output<string>();

  private stateService = inject(MessageBoxStateService);
  private composerService = inject(MessageComposerService);
  private searchService = inject(MessageSearchService);

  protected message = this.composerService.getMessage();
  protected isEmojiPickerOpen = this.stateService.getEmojiPickerOpen();
  protected isUserSelectionOpen = this.stateService.getUserSelectionOpen();
  protected isChannelSelectionOpen = this.stateService.getChannelSelectionOpen();
  protected isMessageSearchOpen = this.stateService.getMessageSearchOpen();
  protected selectedUsers = this.composerService.getSelectedUsers();
  protected selectedChannels = this.composerService.getSelectedChannels();

  /**
   * Mention chips computed from service
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  protected mentionChips = computed(() => {
    return this.composerService.getMentionChips();
  });

  /**
   * Update message text
   * @description Updates composer draft text through the composer service so derived mention/search state recalculates consistently.
   * @param {string} text - New message text
   * @returns {void}
   */
  protected updateMessage = (text: string): void => {
    this.composerService.setMessage(text);
  };

  /**
   * Available users that are NOT yet selected
   * @description Filters mention candidates to users not already represented by chips.
   */
  protected availableUsers = computed<UserListItem[]>(() => {
    const selectedIds = this.selectedUsers().map((u) => u.id);
    return this.searchService.excludeSelected(this.users(), selectedIds);
  });

  /**
   * Available channels that are NOT yet selected
   * @description Filters channel mention candidates to channels not already represented by chips.
   */
  protected availableChannels = computed<ChannelListItem[]>(() => {
    const selectedIds = this.selectedChannels().map((c) => c.id);
    return this.searchService.excludeSelected(this.channels(), selectedIds);
  });

  /**
   * Get search prefix from message input
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  protected searchPrefix = computed(() => {
    return this.searchService.getSearchPrefix(this.message());
  });

  /**
   * Get search term without prefix
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  protected searchTerm = computed(() => {
    return this.searchService.getSearchTerm(this.message());
  });

  /**
   * Filtered messages based on $ search
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  protected filteredMessages = computed<MessageSearchItem[]>(() => {
    if (this.searchPrefix() !== '$') return [];
    return this.searchService.filterMessages(this.messages(), this.searchTerm());
  });

  /**
   * Filtered channels based on # search
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  protected filteredChannels = computed<ChannelListItem[]>(() => {
    if (this.searchPrefix() !== '#') return [];
    return this.searchService.filterChannels(this.availableChannels(), this.searchTerm());
  });

  /**
   * Show message search popup when $ prefix is used
   * @description Shows message-search overlay only when search mode is active and at least one result is available.
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
   * @description Restricts channel-picker visibility to active channel-prefix mode.
   */
  protected showChannelSelection = computed(() => {
    return this.isChannelSelectionOpen() && this.searchPrefix() === '#';
  });

  /**
   * Send message
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Builds and emits message if not empty, then resets state
   * @returns {void}
   */
  protected sendMessage = (): void => {
    const fullMessage = this.composerService.buildFullMessage();

    if (fullMessage.trim()) {
      this.messageSent.emit(fullMessage);
      this.composerService.reset();
      this.stateService.closeAll();
    }
  };

  /**
   * Handle message input change to detect search prefix
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Detects @, #, or $ prefixes and opens appropriate selection popup
   * @returns {void}
   */
  protected onMessageInput = (): void => {
    const prefix = this.searchPrefix();
    const term = this.searchTerm();

    if (!this.message().trim()) {
      this.stateService.closeAll();
      return;
    }

    if (prefix === '$' && term.length >= 3) {
      this.stateService.openMessageSearch();
    } else if (prefix === '$') {
      this.stateService.closeMessageSearch();
    } else if (prefix === '@') {
      this.stateService.openUserSelection();
    } else if (prefix === '#') {
      this.stateService.openChannelSelection();
    } else {
      this.stateService.closeAll();
    }
  };

  /**
   * Toggle emoji picker
   * @description Toggles emoji picker state while preserving mutual exclusivity rules managed by popup state service.
   * Opens emoji picker and closes other popups
   * @returns {void}
   */
  protected openEmojiPicker = (): void => {
    this.stateService.toggleEmojiPicker();
  };

  /**
   * Handle emoji reaction selection
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Inserts emoji at cursor position and closes picker
   * @param {ReactionType} reaction - Reaction type to insert
   * @returns {void}
   */
  protected onEmojiReaction = (reaction: ReactionType): void => {
    this.composerService.addEmoji(reaction);
    this.stateService.closeAll();
  };

  /**
   * Toggle user mention picker
   * @description Toggles user mention picker through centralized popup state handling.
   * Opens user selection popup and closes other popups
   * @returns {void}
   */
  protected openMentionPicker = (): void => {
    this.stateService.toggleUserSelection();
  };

  /**
   * Handle user selection from mention picker
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Adds user as chip and clears search input
   * @param {UserListItem} user - Selected user to mention
   * @returns {void}
   */
  protected onUserSelected = (user: UserListItem): void => {
    this.composerService.addUser(user);
    this.composerService.setMessage('');
    this.stateService.closeUserSelection();
  };

  /**
   * Handle channel selection from mention picker
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Adds channel as chip and clears search input
   * @param {ChannelListItem} channel - Selected channel to mention
   * @returns {void}
   */
  protected onChannelSelected = (channel: ChannelListItem): void => {
    this.composerService.addChannel(channel);
    this.composerService.setMessage('');
    this.stateService.closeChannelSelection();
  };

  /**
   * Remove a mention chip
   * @description Removes a selected mention chip by delegating to user/channel-specific composer removal handlers.
   * Removes user or channel from selected mentions
   * @param {MentionChipData} chip - Mention chip to remove
   * @returns {void}
   */
  protected onChipRemoved = (chip: MentionChipData): void => {
    if (chip.type === 'user') {
      this.composerService.removeUser(chip.id);
    } else {
      this.composerService.removeChannel(chip.id);
    }
  };

  /**
   * Close user selection popup
   * @description Closes user picker explicitly after cancel or external close interactions.
   * @returns {void}
   */
  protected onUserSelectionClosed = (): void => {
    this.stateService.closeUserSelection();
  };

  /**
   * Close channel selection popup
   * @description Closes channel picker explicitly after cancel or external close interactions.
   * @returns {void}
   */
  protected onChannelSelectionClosed = (): void => {
    this.stateService.closeChannelSelection();
  };

  /**
   * Handle message search result selection
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Emits message ID to scroll to that message
   * @param {MessageSearchItem} message - Selected message from search
   * @returns {void}
   */
  protected onMessageResultSelected = (message: MessageSearchItem): void => {
    this.composerService.setMessage('');
    this.stateService.closeAll();
    this.messageSelected.emit(message.id);
  };

  /**
   * Close message search popup
   * @description Closes message-search overlay while keeping draft text state intact.
   * @returns {void}
   */
  protected onMessageSearchClosed = (): void => {
    this.stateService.closeMessageSearch();
  };
}
