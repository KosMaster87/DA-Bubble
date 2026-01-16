/**
 * @fileoverview Chat New Msg Component
 * @description Component for composing new messages with search and message box
 * @module features/dashboard/components/chat-new-msg
 */

import { Component, output, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import { ChannelListItem } from '@shared/dashboard-components/channel-list-item/channel-list-item.component';
import { MessageSearchItem } from '@shared/dashboard-components/message-search-item/message-search-item.component';
import { UserSelectionComponent } from '@shared/dashboard-components/user-selection/user-selection.component';
import { ChannelSelectionComponent } from '@shared/dashboard-components/channel-selection/channel-selection.component';
import { MessageSelectionComponent } from '@shared/dashboard-components/message-selection/message-selection.component';
import { UserStore } from '@stores/user.store';
import { SearchAutocompleteService } from '@shared/services/search-autocomplete.service';

@Component({
  selector: 'app-chat-new-msg',
  imports: [
    FormsModule,
    MessageBoxComponent,
    UserSelectionComponent,
    ChannelSelectionComponent,
    MessageSelectionComponent,
  ],
  templateUrl: './chat-new-msg.component.html',
  styleUrl: './chat-new-msg.component.scss',
})
export class ChatNewMsgComponent {
  private userStore = inject(UserStore);
  private searchService = inject(SearchAutocompleteService);
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
    if (query.startsWith('$')) return '$';
    return '';
  });

  /**
   * Check which popup to show
   */
  protected showUserSelection = computed(() => this.isDropdownOpen() && this.searchPrefix() === '@' && this.userResults().length > 0);
  protected showChannelSelection = computed(() => this.isDropdownOpen() && this.searchPrefix() === '#' && this.channelResults().length > 0);
  protected showMessageSelection = computed(() => this.isDropdownOpen() && this.searchPrefix() === '$' && this.messageResults().length > 0);

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
   * Filtered message search results
   */
  protected messageResults = computed<MessageSearchItem[]>(() => {
    return this.searchResults()
      .filter(r => r.type === 'message')
      .map(r => ({
        id: r.id,
        displayName: r.displayName,
        description: r.description || '',
        type: r.displayName.startsWith('#') ? 'channel' as const : 'dm' as const,
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
    console.log('Search for:', query);
    console.log('Search prefix:', this.searchPrefix());
    console.log('User results:', this.userResults().length);
    console.log('Channel results:', this.channelResults().length);
    console.log('Message results:', this.messageResults().length);
    this.searchService.setSearchQuery(query);
    this.isDropdownOpen.set(query.length > 0);
    console.log('Dropdown open:', this.isDropdownOpen());
    console.log('Show user selection:', this.showUserSelection());
    console.log('Show channel selection:', this.showChannelSelection());
    console.log('Show message selection:', this.showMessageSelection());
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
    console.log('User selected:', user);
    this.isDropdownOpen.set(false);
    this.searchQuery.set('');
    this.searchService.clearSearch();
    // TODO: Navigate to DM with user or set as recipient
  }

  /**
   * Handle channel selection
   */
  onChannelSelected(channel: ChannelListItem): void {
    console.log('Channel selected:', channel);
    this.isDropdownOpen.set(false);
    this.searchQuery.set('');
    this.searchService.clearSearch();
    // TODO: Navigate to channel
  }

  /**
   * Handle message search result selection
   */
  onMessageResultSelected(message: MessageSearchItem): void {
    console.log('Message result selected:', message);
    this.isDropdownOpen.set(false);
    this.searchQuery.set('');
    this.searchService.clearSearch();
    // TODO: Navigate to channel/DM with message context
  }
}
