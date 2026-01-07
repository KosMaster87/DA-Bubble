/**
 * @fileoverview Dashboard State Service
 * @description Manages dashboard view state and transitions
 * @module shared/services/dashboard-state
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { ChannelStore } from '@stores/channel.store';
import { DirectMessageStore } from '@stores/direct-message.store';
import { UserStore } from '@stores/user.store';
import { AuthStore } from '@stores/auth';

export type DashboardView =
  | 'welcome'
  | 'chat-new-msg'
  | 'mailbox'
  | 'legal'
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
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardStateService {
  private channelStore = inject(ChannelStore);
  private directMessageStore = inject(DirectMessageStore);
  private userStore = inject(UserStore);
  private authStore = inject(AuthStore);

  // View state signals
  private _currentView = signal<DashboardView>('welcome');
  private _selectedChannel = signal<ChannelInfo | null>(null);
  private _selectedDM = signal<DMInfo | null>(null);

  // Public readonly signals
  readonly currentView = this._currentView.asReadonly();
  readonly selectedChannel = this._selectedChannel.asReadonly();
  readonly selectedDM = this._selectedDM.asReadonly();

  /**
   * Show welcome view
   */
  showWelcome(): void {
    this._currentView.set('welcome');
  }

  /**
   * Show new message view
   */
  showNewMessage(): void {
    this._currentView.set('chat-new-msg');
  }

  /**
   * Show mailbox view
   */
  showMailbox(): void {
    this._currentView.set('mailbox');
  }

  /**
   * Show legal overview view
   */
  showLegal(): void {
    this._currentView.set('legal');
  }

  /**
   * Show channel by ID
   * @param channelId Channel ID to display
   * @param deselectDM Callback to deselect DM in sidebar
   * @returns true if channel was shown, false if not found
   */
  showChannel(channelId: string, deselectDM?: () => void): boolean {
    // Special channels - check BEFORE trying to lookup
    if (channelId === 'mailbox') {
      this.showMailbox();
      return true;
    }

    if (channelId === 'legal') {
      this.showLegal();
      return true;
    }

    // Get channel from store
    const channelGetter = this.channelStore.getChannelById();
    const channel = channelGetter ? channelGetter(channelId) : null;
    if (!channel) return false;

    // DABubble-welcome channel - special view
    if (channel.name === 'DABubble-welcome') {
      this._currentView.set('welcome');
      if (deselectDM) deselectDM();
      return true;
    }

    // Regular channel
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
  }

  /**
   * Show direct message by conversation ID
   * @param conversationId Conversation ID
   * @param participants Optional participants array (for newly created conversations)
   * @returns true if DM was shown, false if not found
   */
  showDirectMessage(conversationId: string, participants?: [string, string]): boolean {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return false;

    // Get conversation from DirectMessageStore
    let conversation = this.directMessageStore
      .sortedConversations()
      .find((c) => c.id === conversationId);

    // Determine other user ID
    let otherUserId: string | undefined;
    if (!conversation && participants) {
      otherUserId = participants.find((id) => id !== currentUserId);
      // If otherUserId is undefined or same as currentUserId, this is a self-DM
      if (!otherUserId || otherUserId === currentUserId) {
        otherUserId = currentUserId;
      }
      console.log('Using provided participants, otherUserId:', otherUserId);
    } else if (conversation) {
      otherUserId = conversation.participants.find((id) => id !== currentUserId);
      // If no other user found, this is a self-DM
      if (!otherUserId) {
        otherUserId = currentUserId;
      }
    }

    if (!otherUserId) {
      console.error('Cannot determine other user');
      return false;
    }

    // Get other user's data from UserStore
    const otherUser = this.userStore.getUserById()(otherUserId);
    if (!otherUser) {
      console.error('Other user not found:', otherUserId);
      return false;
    }

    // For self-DM, show special title
    const isSelfDM = otherUserId === currentUserId;
    const displayName = isSelfDM ? `${otherUser.displayName} (Notes)` : otherUser.displayName;

    this._selectedDM.set({
      conversationId: conversationId,
      userName: displayName,
      userAvatar: otherUser.photoURL || '/img/profile/profile-0.svg',
      isOnline: otherUser.isOnline,
    });

    console.log('✅ Setting currentView to direct-message', {
      conversationId,
      userName: otherUser.displayName,
      selectedDMValue: this._selectedDM(),
    });

    this._currentView.set('direct-message');

    console.log('📊 After setting currentView', {
      currentView: this._currentView(),
      selectedDM: this._selectedDM(),
      hasSelectedDM: !!this._selectedDM(),
    });

    return true;
  }

  /**
   * Navigate to DABubble-welcome channel
   * @returns Welcome channel ID if found, null otherwise
   */
  navigateToWelcome(): string | null {
    const welcomeChannel = this.channelStore
      .channels()
      .find((ch) => ch.name === 'DABubble-welcome');

    if (welcomeChannel) {
      return welcomeChannel.id;
    }

    this.showWelcome();
    return null;
  }
}
