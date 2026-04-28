/**
 * @fileoverview Dashboard State Service
 * @description Coordinates dashboard-level view selection so channel, DM, mailbox, and static views transition through one consistent state surface.
 * @module shared/services/dashboard-state
 */

import { Injectable, inject, signal } from '@angular/core';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { WelcomeChannelSelectorService } from '@core/services/workspace-initialization/welcome-channel-selector.service';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/channels/channel.store';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { UserStore } from '@stores/users/user.store';
import { ThreadManagementService } from './thread-management.service';

export type DashboardView =
  | 'none' // No content view (sidebar only, for mobile)
  | 'welcome'
  | 'chat-new-msg'
  | 'mailbox'
  | 'legal'
  | 'settings'
  | 'channel'
  | 'direct-message';

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
}

export interface DMInfo {
  conversationId: string;
  userName: string;
  userAvatar: string;
  isOnline: boolean;
}

/**
 * Service for managing dashboard view state
 * @description Acts as the single source of truth for active dashboard view selection across route-driven and click-driven navigation.
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardStateService {
  private channelStore = inject(ChannelStore);
  private directMessageStore = inject(DirectMessageStore);
  private userStore = inject(UserStore);
  private authStore = inject(AuthStore);
  private navigationService = inject(NavigationService);
  private threadManagement = inject(ThreadManagementService);
  private welcomeSelector = inject(WelcomeChannelSelectorService);

  // View state signals
  private _currentView = signal<DashboardView>('none');
  private _selectedChannel = signal<ChannelInfo | null>(null);
  private _selectedDM = signal<DMInfo | null>(null);

  // Public readonly signals
  readonly currentView = this._currentView.asReadonly();
  readonly selectedChannel = this._selectedChannel.asReadonly();
  readonly selectedDM = this._selectedDM.asReadonly();

  /**
   * Clear all views and selections (for mobile back to sidebar)
   * @description Resets dashboard content state for sidebar-first mobile navigation, preventing stale channel/DM context from persisting.
   */
  clearAllViews(): void {
    this._currentView.set('none'); // No content view
    this._selectedChannel.set(null);
    this._selectedDM.set(null);
  }

  /**
   * Show welcome view
   * @description Routes explicit welcome transitions through one method so onboarding-entry behavior stays consistent.
   */
  showWelcome(): void {
    this._currentView.set('welcome');
  }

  /**
   * Show new message view
   * @description Activates compose mode without mutating channel or DM selection, preserving previous context for return navigation.
   */
  showNewMessage(): void {
    this._currentView.set('chat-new-msg');
  }

  /**
   * Show mailbox view
   * @description Switches to mailbox while keeping dashboard-level selection handling in one place.
   */
  showMailbox(): void {
    this._currentView.set('mailbox');
  }

  /**
   * Show legal overview view
   * @description Exposes legal navigation as a state transition so shell rendering remains signal-driven.
   */
  showLegal(): void {
    this._currentView.set('legal');
  }

  /**
   * Show settings view
   * @description Keeps settings activation in the same state machine as conversation views to avoid divergent rendering paths.
   */
  showSettings(): void {
    this._currentView.set('settings');
  }

  /**
   * Show channel by ID
   * @description Resolves all channel-entry variants in one branch, including special pseudo-channels and welcome handling.
   * @param channelId Channel ID to display
   * @param deselectDM Callback to deselect DM in sidebar
   * @returns true if channel was shown, false if not found
   */
  showChannel(channelId: string, deselectDM?: () => void): boolean {
    if (this.handleSpecialChannels(channelId)) return true;

    const channel = this.getChannelFromStore(channelId);
    if (!channel) return false;

    if (this.isWelcomeChannel(channel)) {
      return this.showWelcomeChannel(deselectDM);
    }

    return this.showRegularChannel(channel, deselectDM);
  }

  /**
   * Handle special non-channel views
   * @description Converts reserved channel IDs into non-channel dashboard views before store lookups occur.
   */
  private handleSpecialChannels = (channelId: string): boolean => {
    if (channelId === 'mailbox') {
      this.showMailbox();
      return true;
    }
    if (channelId === 'legal') {
      this.showLegal();
      return true;
    }
    if (channelId === 'settings') {
      this.showSettings();
      return true;
    }
    return false;
  };

  /**
   * Get channel from store by ID
   * @description Isolates channel retrieval so missing-channel handling stays consistent for all channel-entry paths.
   */
  private getChannelFromStore = (channelId: string): any | null => {
    const channelGetter = this.channelStore.getChannelById();
    return channelGetter ? channelGetter(channelId) : null;
  };

  /**
   * Check if channel is welcome channel
   * @description Encapsulates welcome-channel detection so naming-rule changes stay local to one helper.
   */
  private isWelcomeChannel = (channel: any): boolean => {
    return channel.name === 'DABubble-welcome';
  };

  /**
   * Show welcome channel view
   * @description Applies welcome-view state and optional DM deselection as one atomic transition.
   */
  private showWelcomeChannel = (deselectDM?: () => void): boolean => {
    this._currentView.set('welcome');
    if (deselectDM) deselectDM();
    return true;
  };

  /**
   * Show regular channel view
   * @description Materializes channel info into dashboard view state so templates do not depend on raw channel-store entities.
   */
  private showRegularChannel = (channel: any, deselectDM?: () => void): boolean => {
    this._selectedChannel.set({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.isPrivate,
      memberCount: channel.members.length,
    });

    if (deselectDM) deselectDM();
    this._currentView.set('channel');
    return true;
  };

  /**
   * Show direct message by conversation ID
   * @description Resolves peer identity and hydrates DM view state so sidebar and content panes stay synchronized.
   * @param conversationId Conversation ID
   * @param participants Optional participants array (for newly created conversations)
   * @returns true if DM was shown, false if not found
   */
  showDirectMessage(conversationId: string, participants?: [string, string]): boolean {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return false;

    const otherUserId = this.determineOtherUser(conversationId, participants, currentUserId);
    if (!otherUserId) return false;

    const otherUser = this.getUserData(otherUserId);
    if (!otherUser) return false;

    this.setDirectMessageView(conversationId, otherUserId, currentUserId, otherUser);
    return true;
  }

  /**
   * Determine other user ID from conversation
   * @description Unifies participant resolution for persisted and newly created conversations, including self-DM fallback.
   */
  private determineOtherUser = (
    conversationId: string,
    participants: [string, string] | undefined,
    currentUserId: string,
  ): string | null => {
    const conversation = this.getConversation(conversationId);

    const otherUserId = conversation
      ? this.getOtherUserFromConversation(conversation, currentUserId)
      : this.getOtherUserFromParticipants(participants, currentUserId);

    if (!otherUserId) {
      return null;
    }

    return otherUserId;
  };

  /**
   * Get conversation from store
   * @description Keeps conversation lookup semantics in one helper for easier debugging of navigation mismatch cases.
   */
  private getConversation = (conversationId: string): any | undefined => {
    return this.directMessageStore.sortedConversations().find((c) => c.id === conversationId);
  };

  /**
   * Get other user from conversation participants
   * @description Extracts the peer participant from stored conversation data while supporting self-DM edge cases.
   */
  private getOtherUserFromConversation = (conversation: any, currentUserId: string): string => {
    const otherUserId = conversation.participants.find((id: string) => id !== currentUserId);
    return otherUserId || currentUserId; // Self-DM if no other user
  };

  /**
   * Get other user from participants array
   * @description Resolves the peer user directly from raw participant tuples so new conversations work even before conversation entities are fully materialized in store state.
   */
  private getOtherUserFromParticipants = (
    participants: [string, string] | undefined,
    currentUserId: string,
  ): string | null => {
    if (!participants) return null;

    const otherUserId = participants.find((id) => id !== currentUserId);
    return otherUserId || currentUserId; // Self-DM if same user
  };

  /**
   * Get user data from store
   * @description Guards DM view activation against missing user entities so the dashboard never renders incomplete peer info.
   */
  private getUserData = (userId: string): any | null => {
    const user = this.userStore.getUserById()(userId);
    if (!user) {
      return null;
    }
    return user;
  };

  /**
   * Set direct message view with user data
   * @description Commits the final DM view payload in one place so all successful resolution paths produce identical state shape.
   */
  private setDirectMessageView = (
    conversationId: string,
    otherUserId: string,
    currentUserId: string,
    otherUser: any,
  ): void => {
    const dmInfo = this.createDMInfo(conversationId, otherUserId, currentUserId, otherUser);
    this._selectedDM.set(dmInfo);
    this._currentView.set('direct-message');
  };

  /**
   * Create DM info object
   * @description Normalizes DM header payload creation so all DM entry paths render the same participant metadata.
   */
  private createDMInfo = (
    conversationId: string,
    otherUserId: string,
    currentUserId: string,
    otherUser: any,
  ): DMInfo => {
    const isSelfDM = otherUserId === currentUserId;
    const displayName = isSelfDM ? `${otherUser.displayName} (Notes)` : otherUser.displayName;

    return {
      conversationId,
      userName: displayName,
      userAvatar: otherUser.photoURL || '/img/profile/profile-0.svg',
      isOnline: otherUser.isOnline,
    };
  };

  /**
   * Navigate to DABubble-welcome channel
   * @description Centralizes welcome-channel fallback navigation so desktop shell recovery always follows the same path.
   * @returns Welcome channel ID if found, null otherwise
   */
  navigateToWelcome(): string | null {
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }

    const welcomeChannelId = this.welcomeSelector.findWelcomeChannelId();

    if (welcomeChannelId) {
      this.navigationService.navigateToChannel(welcomeChannelId);
      return welcomeChannelId;
    }

    this.showWelcome();
    return null;
  }
}
