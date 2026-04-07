/**
 * @fileoverview Channel Mailbox Component
 * @description Mailbox for receiving messages, invitations, and system notifications
 * @module features/dashboard/components/channel-mailbox
 */

import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { Invitation } from '@core/models/invitation.model';
import { InvitationManagementService } from '@core/services/invitation-management/invitation-management.service';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { MailboxInteractionService } from '@core/services/mailbox-interaction/mailbox-interaction.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { AuthStore } from '@stores/auth';
import { ChannelStore, MailboxStore } from '@stores/index';

@Component({
  selector: 'app-channel-mailbox',
  imports: [DatePipe],
  templateUrl: './channel-mailbox.component.html',
  styleUrl: './channel-mailbox.component.scss',
})
export class ChannelMailboxComponent {
  protected channelStore = inject(ChannelStore);
  protected mailboxStore = inject(MailboxStore);
  protected authStore = inject(AuthStore);
  private invitationService = inject(InvitationService);
  private invitationManagement = inject(InvitationManagementService);
  private mailboxInteraction = inject(MailboxInteractionService);
  private userTransformation = inject(UserTransformationService);

  // Output for navigation after accepting invitation
  channelSelected = output<string>();
  backRequested = output<void>(); // For mobile back navigation

  // Invitations state
  protected invitations = signal<Invitation[]>([]);
  protected invitationsError = signal<string | null>(null);
  protected pendingInvitations = computed(() =>
    this.invitations().filter((inv) => inv.status === 'pending'),
  );
  protected pendingCount = computed(() => this.pendingInvitations().length);

  /**
   * Get sender name for invitation
   */
  protected getSenderName = (senderId: string): string => {
    return this.userTransformation.getUserDisplayName(senderId, 'Unbekannter User');
  };

  /**
   * Get sender avatar for invitation
   */
  protected getSenderAvatar = (senderId: string): string => {
    return this.userTransformation.getUserAvatar(senderId, '/img/profile/profile-1.png');
  };

  private invitationUnsubscribe: (() => void) | null = null;

  constructor() {
    // Load mailbox messages when user changes
    effect(() => {
      const currentUser = this.authStore.user();
      if (currentUser?.uid) {
        this.mailboxStore.setCurrentUser(currentUser.uid);
        this.loadInvitations(currentUser.uid);
      }
    });
  }

  /**
   * Mailbox title from ChannelStore
   */
  protected mailboxTitle = computed(() => {
    const channel = this.channelStore.getChannelById()('mailbox');
    return channel?.name || 'Mailbox';
  });

  /**
   * Mailbox description from ChannelStore
   */
  protected mailboxDescription = computed(() => {
    const channel = this.channelStore.getChannelById()('mailbox');
    return channel?.description || 'Messages from contacts, admins, and system notifications';
  });

  /**
   * Messages from mailbox store
   */
  protected messages = computed(() => this.mailboxStore.messages());

  /**
   * Unread message count
   */
  protected unreadCount = computed(() => this.mailboxStore.unreadCount());

  /**
   * Loading state
   */
  protected loading = computed(() => this.mailboxStore.loading());

  /**
   * Error state from mailbox store
   */
  protected storeError = computed(() => this.mailboxStore.error());

  /**
   * Load invitations for current user
   */
  private loadInvitations = (userId: string): void => {
    this.unsubscribeFromInvitations();
    this.subscribeToInvitations(userId);
  };

  /**
   * Unsubscribe from previous invitation listener
   */
  private unsubscribeFromInvitations = (): void => {
    if (this.invitationUnsubscribe) {
      this.invitationUnsubscribe();
    }
  };

  /**
   * Subscribe to real-time invitation updates
   */
  private subscribeToInvitations = (userId: string): void => {
    this.invitationUnsubscribe = this.invitationService.subscribeToInvitations(
      userId,
      (invitations) => {
        this.invitations.set(invitations);
        this.invitationsError.set(null);
        console.log('📬 Invitations loaded:', invitations.length);
      },
    );
  };

  /**
   * Handle message click
   */
  onMessageClick = async (messageId: string): Promise<void> => {
    await this.mailboxInteraction.handleMessageClick(messageId);
  };

  /**
   * Accept an invitation
   */
  acceptInvitation = async (invitation: Invitation): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    await this.invitationManagement.acceptInvitation(invitation, currentUserId);
  };

  /**
   * Decline an invitation
   */
  declineInvitation = async (invitationId: string): Promise<void> => {
    await this.invitationManagement.declineInvitation(invitationId);
  };

  /**
   * Mark all messages as read
   */
  markAllAsRead = async (): Promise<void> => {
    await this.mailboxInteraction.markAllAsRead();
  };

  /**
   * Delete a message
   */
  deleteMessage = async (messageId: string): Promise<void> => {
    await this.mailboxInteraction.deleteMessage(messageId);
  };
}
