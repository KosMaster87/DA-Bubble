/**
 * @fileoverview Chat New Msg Component
 * @description Component for composing new messages with search and message box
 * @module features/dashboard/components/chat-new-msg
 */

import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { ChannelListItem } from '@shared/dashboard-components/channel-list-item/channel-list-item.component';
import { ChannelSelectionComponent } from '@shared/dashboard-components/channel-selection/channel-selection.component';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import { UserSelectionComponent } from '@shared/dashboard-components/user-selection/user-selection.component';
import { SearchAutocompleteService } from '@shared/services/search-autocomplete.service';
import { ChannelStore } from '@stores/channels/channel.store';
import { UserStore } from '@stores/users/user.store';

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
  private navigationService = inject(NavigationService);
  backRequested = output<void>();

  protected searchQuery = signal('');
  protected isDropdownOpen = signal(false);

  /**
   * Get search prefix from query
    * @description Isolates prefix parsing so routing between user and channel autocomplete modes is deterministic and reusable.
   * @returns {Signal<string>} Search prefix (# or @ or empty)
   */
  protected searchPrefix = computed(() => {
    const query = this.searchQuery();
    if (query.startsWith('#')) return '#';
    if (query.startsWith('@')) return '@';
    return '';
  });

  /**
   * Check if user selection popup should show
    * @description Gates user suggestions on intent and result presence so dropdown UI only appears for actionable user queries.
   * @returns {Signal<boolean>} True if user dropdown visible
   */
  protected showUserSelection = computed(() => this.isDropdownOpen() && this.searchPrefix() === '@' && this.userResults().length > 0);

  /**
   * Check if channel selection popup should show
    * @description Mirrors user-dropdown gating for channels to keep autocomplete behavior symmetric across mention types.
   * @returns {Signal<boolean>} True if channel dropdown visible
   */
  protected showChannelSelection = computed(() => this.isDropdownOpen() && this.searchPrefix() === '#' && this.channelResults().length > 0);

  /**
   * All workspace users for message-box mentions
    * @description Projects store users into mention-ready UI items so templates do not depend on raw user-entity shape.
   * @returns {Signal<UserListItem[]>} User list items
   */
  protected allUsers = computed<UserListItem[]>(() => {
    return this.userStore.users().map(user => ({
      id: user.uid,
      name: user.displayName,
      avatar: user.photoURL || '',
    }));
  });

  /**
   * All public channels for message-box mentions
    * @description Limits mention targets to public channels so compose suggestions respect channel visibility rules.
   * @returns {Signal<ChannelListItem[]>} Channel list items
   */
  protected channelListItems = computed<ChannelListItem[]>(() => {
    return this.channelStore.getPublicChannels().map((ch) => ({
      id: ch.id,
      name: ch.name,
    }));
  });

  /**
   * Search results from autocomplete service
    * @description Consumes shared autocomplete state so this component stays aligned with global search matching logic.
   * @returns {Signal} Autocomplete search results
   */
  protected searchResults = this.searchService.searchResults;

  /**
   * Filtered user results from search
    * @description Normalizes service results into user row models used by the selection dropdown component.
   * @returns {Signal<UserListItem[]>} User search results
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
   * Filtered channel results from search
    * @description Normalizes service results into channel row models so dropdown rendering remains type-safe and consistent.
   * @returns {Signal<ChannelListItem[]>} Channel search results
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
   * Check if search has any results
    * @description Provides a single empty-state predicate for template branches to avoid repeated length checks in markup.
   * @returns {Signal<boolean>} True if results exist
   */
  protected hasResults = computed(() => this.searchResults().length > 0);

  /**
   * Handle search input
    * @description Syncs query text into autocomplete service and dropdown visibility so input and suggestion UI never diverge.
   * @returns {void}
   */
  onSearch = (): void => {
    const query = this.searchQuery();
    this.searchService.setSearchQuery(query);
    this.isDropdownOpen.set(query.length > 0);
  };

  /**
   * Close dropdown popup
    * @description Central close handler keeps dropdown teardown behavior identical for outside-click and selection completion flows.
   * @returns {void}
   */
  onDropdownClose = (): void => {
    this.isDropdownOpen.set(false);
  };

  /**
   * Handle user selection from dropdown
    * @description Clears transient autocomplete state before navigation so next compose session starts from a clean search context.
   * @param {UserListItem} user - Selected user
   * @returns {void}
   */
  onUserSelected = (user: UserListItem): void => {
    this.isDropdownOpen.set(false);
    this.searchService.clearSearch();
    this.navigationService.navigateToDirectMessage(user.id);
  };

  /**
   * Handle channel selection from dropdown
    * @description Reuses the same cleanup-before-navigation pattern as user selection to keep compose-to-destination transitions consistent.
   * @param {ChannelListItem} channel - Selected channel
   * @returns {void}
   */
  onChannelSelected = (channel: ChannelListItem): void => {
    this.isDropdownOpen.set(false);
    this.searchService.clearSearch();
    this.navigationService.navigateToChannel(channel.id);
  };
}
