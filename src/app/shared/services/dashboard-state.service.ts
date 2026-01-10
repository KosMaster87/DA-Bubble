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
    return false;
  };

  /**
   * Get channel from store by ID
   */
  private getChannelFromStore = (channelId: string): any | null => {
    const channelGetter = this.channelStore.getChannelById();
    return channelGetter ? channelGetter(channelId) : null;
  };

  /**
   * Check if channel is welcome channel
   */
  private isWelcomeChannel = (channel: any): boolean => {
    return channel.name === 'DABubble-welcome';
  };

  /**
   * Show welcome channel view
   */
  private showWelcomeChannel = (deselectDM?: () => void): boolean => {
    this._currentView.set('welcome');
    if (deselectDM) deselectDM();
    return true;
  };

  /**
   * Show regular channel view
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
   */
  private determineOtherUser = (
    conversationId: string,
    participants: [string, string] | undefined,
    currentUserId: string
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
   */
  private getConversation = (conversationId: string): any | undefined => {
    return this.directMessageStore
      .sortedConversations()
      .find((c) => c.id === conversationId);
  };

  /**
   * Get other user from conversation participants
   */
  private getOtherUserFromConversation = (
    conversation: any,
    currentUserId: string
  ): string => {
    const otherUserId = conversation.participants.find((id: string) => id !== currentUserId);
    return otherUserId || currentUserId; // Self-DM if no other user
  };

  /**
   * Get other user from participants array
   */
  private getOtherUserFromParticipants = (
    participants: [string, string] | undefined,
    currentUserId: string
  ): string | null => {
    if (!participants) return null;

    const otherUserId = participants.find((id) => id !== currentUserId);
    return otherUserId || currentUserId; // Self-DM if same user
  };

  /**
   * Get user data from store
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
   */
  private setDirectMessageView = (
    conversationId: string,
    otherUserId: string,
    currentUserId: string,
    otherUser: any
  ): void => {
    const dmInfo = this.createDMInfo(conversationId, otherUserId, currentUserId, otherUser);
    this._selectedDM.set(dmInfo);
    this._currentView.set('direct-message');
  };

  /**
   * Create DM info object
   */
  private createDMInfo = (
    conversationId: string,
    otherUserId: string,
    currentUserId: string,
    otherUser: any
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
