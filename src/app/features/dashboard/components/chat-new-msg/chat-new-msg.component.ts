/**
 * @fileoverview Chat New Msg Component
 * @description Component for composing new messages with search and message box
 * @module features/dashboard/components/chat-new-msg
 */

import { Component, output, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import { ChannelListItem } from '@shared/dashboard-components/channel-list-item/channel-list-item.component';
import { UserSelectionComponent } from '@shared/dashboard-components/user-selection/user-selection.component';
import { ChannelSelectionComponent } from '@shared/dashboard-components/channel-selection/channel-selection.component';
import { UserStore } from '@stores/user.store';
import { ChannelStore } from '@stores/channel.store';
import { SearchAutocompleteService } from '@shared/services/search-autocomplete.service';

@Component({
  selector: 'app-chat-new-msg',
  imports: [
    FormsModule,
    MessageBoxComponent,
    UserSelectionComponent,
    ChannelSelectionComponent,
  ],
  templateUrl: './chat-new-msg.component.html',
  styleUrl: './chat-new-msg.component.scss',
})
export class ChatNewMsgComponent {
  private userStore = inject(UserStore);
  private channelStore = inject(ChannelStore);
  private searchService = inject(SearchAutocompleteService);
  private router = inject(Router);
  backRequested = output<void>();

  protected searchQuery = signal('');
  protected isDropdownOpen = signal(false);

  /**
   * Get search prefix
   */
  protected searchPrefix = computed(() => {
    const query = this.searchQuery();
    if (query.startsWith('#')) return '#';
    if (query.startsWith('@')) return '@';
    return '';
  });

  /**
   * Check which popup to show
   */
  protected showUserSelection = computed(() => this.isDropdownOpen() && this.searchPrefix() === '@' && this.userResults().length > 0);
  protected showChannelSelection = computed(() => this.isDropdownOpen() && this.searchPrefix() === '#' && this.channelResults().length > 0);

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
   * All public channels for message-box channel mentions
   */
  protected channelListItems = computed<ChannelListItem[]>(() => {
    return this.channelStore.getPublicChannels().map((ch) => ({
      id: ch.id,
      name: ch.name,
    }));
  });

  /**
   * Search results from autocomplete service
   */
  protected searchResults = this.searchService.searchResults;

  /**
   * Filtered user results
   */
  protected userResults = computed<UserListItem[]>(() => {
    return this.searchResults()
      .filter(r => r.type === 'user')
      .map(r => ({
        id: r.id,
        name: r.displayName.replace('@', ''),
        avatar: r.avatar || '',
      }));
  });

  /**
   * Filtered channel results
   */
  protected channelResults = computed<ChannelListItem[]>(() => {
    return this.searchResults()
      .filter(r => r.type === 'channel')
      .map(r => ({
        id: r.id,
        name: r.displayName.replace('#', ''),
      }));
  });

  /**
   * Check if there are any results
   */
  protected hasResults = computed(() => this.searchResults().length > 0);

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
    const query = this.searchQuery();
    this.searchService.setSearchQuery(query);
    this.isDropdownOpen.set(query.length > 0);
  }

  /**
   * Close dropdown
   */
  onDropdownClose(): void {
    this.isDropdownOpen.set(false);
  }

  /**
   * Handle user selection
   */
  onUserSelected(user: UserListItem): void {
    this.isDropdownOpen.set(false);
    this.searchQuery.set(`@${user.name} `);
    this.searchService.clearSearch();
    // TODO: Navigate to DM with user or set as recipient
  }

  /**
   * Handle channel selection
   */
  onChannelSelected(channel: ChannelListItem): void {
    this.isDropdownOpen.set(false);
    this.searchQuery.set(`#${channel.name} `);
    this.searchService.clearSearch();
    // TODO: Navigate to channel
  }
}
