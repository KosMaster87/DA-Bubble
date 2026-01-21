/**
 * @fileoverview Search Results Dropdown Component
 * @description Dropdown component for displaying search results (channels, users, messages)
 * @module shared/dashboard-components/search-results-dropdown
 */

import { Component, input, output } from '@angular/core';
import { UserListItemComponent, UserListItem } from '../user-list-item/user-list-item.component';
import { ChannelListItemComponent, ChannelListItem } from '../channel-list-item/channel-list-item.component';
import { MessageSearchItemComponent, MessageSearchItem } from '../message-search-item/message-search-item.component';

@Component({
  selector: 'app-search-results-dropdown',
  imports: [UserListItemComponent, ChannelListItemComponent, MessageSearchItemComponent],
  templateUrl: './search-results-dropdown.component.html',
  styleUrl: './search-results-dropdown.component.scss',
})
export class SearchResultsDropdownComponent {
  userResults = input<UserListItem[]>([]);
  channelResults = input<ChannelListItem[]>([]);
  messageResults = input<MessageSearchItem[]>([]);

  userSelected = output<string>();
  channelSelected = output<string>();
  messageSelected = output<string>();
  closed = output<void>();

  /**
   * Handle overlay click to close dropdown
   * Emits closed event when overlay is clicked
   * @returns {void}
   */
  protected onOverlayClick = (): void => {
    this.closed.emit();
  };

  /**
   * Handle user selection
   * Emits user ID when user is clicked
   * @param {string} userId - ID of selected user
   * @returns {void}
   */
  protected onUserClick = (userId: string): void => {
    this.userSelected.emit(userId);
  };

  /**
   * Handle channel selection
   * Emits channel ID when channel is clicked
   * @param {string} channelId - ID of selected channel
   * @returns {void}
   */
  protected onChannelClick = (channelId: string): void => {
    this.channelSelected.emit(channelId);
  };

  /**
   * Handle message result selection
   * Emits message ID when message is clicked
   * @param {string} id - ID of selected message
   * @returns {void}
   */
  protected onMessageClick = (id: string): void => {
    this.messageSelected.emit(id);
  };
}
