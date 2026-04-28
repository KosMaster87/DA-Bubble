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
   * @description Resolves invitation sender labels through shared user transformation so mailbox rendering stays consistent with the rest of the app.
   */
  protected getSenderName = (senderId: string): string => {
    return this.userTransformation.getUserDisplayName(senderId, 'Unbekannter User');
  };

  /**
   * Get sender avatar for invitation
   * @description Uses centralized avatar resolution with fallback to prevent broken invitation rows when user data is incomplete.
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
   * @description Derives mailbox meta text from channel data so this view follows the same naming source as sidebar navigation.
   */
  protected mailboxTitle = computed(() => {
    const channel = this.channelStore.getChannelById()('mailbox');
    return channel?.name || 'Mailbox';
  });

  /**
   * Mailbox description from ChannelStore
   * @description Keeps mailbox subtitle centralized in channel metadata to avoid hard-coded copy divergence across components.
   */
  protected mailboxDescription = computed(() => {
    const channel = this.channelStore.getChannelById()('mailbox');
    return channel?.description || 'Messages from contacts, admins, and system notifications';
  });

  /**
   * Messages from mailbox store
   * @description Exposes mailbox store data as a computed signal so template bindings react to updates without additional plumbing.
   */
  protected messages = computed(() => this.mailboxStore.messages());

  /**
   * Unread message count
   * @description Keeps unread badge state tied to store truth so invitation and message actions immediately reflect in the UI.
   */
  protected unreadCount = computed(() => this.mailboxStore.unreadCount());

  /**
   * Loading state
   * @description Surfaces async mailbox loading state for consistent skeleton/disabled behavior during store operations.
   */
  protected loading = computed(() => this.mailboxStore.loading());

  /**
   * Error state from mailbox store
   * @description Forwards mailbox error state so failure messaging stays aligned with store-side error normalization.
   */
  protected storeError = computed(() => this.mailboxStore.error());

  /**
   * Load invitations for current user
   * @description Rebinds invitation listeners on user changes so mailbox invitation state always reflects the active account.
   */
  private loadInvitations = (userId: string): void => {
    this.unsubscribeFromInvitations();
    this.subscribeToInvitations(userId);
  };

  /**
   * Unsubscribe from previous invitation listener
   * @description Keeps realtime subscription flow centralized so lifecycle, cleanup, and error handling stay consistent across call sites.
   */
  private unsubscribeFromInvitations = (): void => {
    if (this.invitationUnsubscribe) {
      this.invitationUnsubscribe();
    }
  };

  /**
   * Subscribe to real-time invitation updates
   * @description Keeps invitation subscription wiring in one method so listener setup and error reset remain paired.
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
   * @description Delegates mailbox click handling to a dedicated interaction service to keep this component focused on rendering concerns.
   */
  onMessageClick = async (messageId: string): Promise<void> => {
    await this.mailboxInteraction.handleMessageClick(messageId);
  };

  /**
   * Accept an invitation
   * @description Routes invitation acceptance through management service so membership updates and side effects remain centralized.
   */
  acceptInvitation = async (invitation: Invitation): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    await this.invitationManagement.acceptInvitation(invitation, currentUserId);
  };

  /**
   * Decline an invitation
   * @description Uses the same invitation management boundary as acceptance to keep status transitions consistent.
   */
  declineInvitation = async (invitationId: string): Promise<void> => {
    await this.invitationManagement.declineInvitation(invitationId);
  };

  /**
   * Mark all messages as read
   * @description Provides a single bulk-read action so unread badge state can be cleared atomically from one user intent.
   */
  markAllAsRead = async (): Promise<void> => {
    await this.mailboxInteraction.markAllAsRead();
  };

  /**
   * Delete a message
   * @description Consolidates teardown cleanup in one method so subscriptions and transient UI state are reliably cleared.
   */
  deleteMessage = async (messageId: string): Promise<void> => {
    await this.mailboxInteraction.deleteMessage(messageId);
  };
}
