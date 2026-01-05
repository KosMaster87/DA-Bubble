/**
 * @fileoverview Channel Mailbox Component
 * @description Mailbox for receiving messages, invitations, and system notifications
 * @module features/dashboard/components/channel-mailbox
 */

import { Component, signal, computed, inject, effect, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ChannelStore, MailboxStore, UserStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { Invitation } from '@core/models/invitation.model';

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
  protected userStore = inject(UserStore);
  protected invitationService = inject(InvitationService);
  protected router = inject(Router);

  // Output for navigation after accepting invitation
  channelSelected = output<string>();

  // Invitations state
  protected invitations = signal<Invitation[]>([]);
  protected invitationsError = signal<string | null>(null);
  protected pendingInvitations = computed(() =>
    this.invitations().filter((inv) => inv.status === 'pending')
  );
  protected pendingCount = computed(() => this.pendingInvitations().length);

  /**
   * Get sender name for invitation
   */
  protected getSenderName = (senderId: string): string => {
    const sender = this.userStore.getUserById()(senderId);
    return sender?.displayName || 'Unbekannter User';
  };

  /**
   * Get sender avatar for invitation
   */
  protected getSenderAvatar = (senderId: string): string => {
    const sender = this.userStore.getUserById()(senderId);
    return sender?.photoURL || '/img/profile/profile-1.png';
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
   * Load invitations for the current user
   */
  private loadInvitations(userId: string): void {
    // Unsubscribe from previous listener
    if (this.invitationUnsubscribe) {
      this.invitationUnsubscribe();
    }

    // Subscribe to real-time invitation updates
    this.invitationUnsubscribe = this.invitationService.subscribeToInvitations(
      userId,
      (invitations) => {
        this.invitations.set(invitations);
        this.invitationsError.set(null); // Clear error on successful load
        console.log('📬 Invitations loaded:', invitations.length);
      }
    );

    // Note: Errors are logged in InvitationService with helpful instructions
    // If index is missing, check console for setup link
  }

  /**
   * Handle message click
   */
  async onMessageClick(messageId: string): Promise<void> {
    await this.mailboxStore.markAsRead(messageId);
    console.log('Message clicked:', messageId);
    // TODO: Open chat window with this message
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitation: Invitation): Promise<void> {
    try {
      const currentUser = this.authStore.user();
      if (!currentUser) {
        console.error('❌ No current user');
        return;
      }

      console.log('🔄 Accepting invitation...', {
        invitationId: invitation.id,
        type: invitation.type,
        channelId: invitation.channelId,
        userId: currentUser.uid,
      });

      // Accept the invitation in Firestore
      await this.invitationService.acceptInvitation(invitation.id);
      console.log('✅ Invitation status updated to accepted');

      // If it's a channel invitation, add user to channel members
      if (invitation.type === 'channel' && invitation.channelId) {
        // Get channel directly from Firestore (user might not be member yet)
        const channelDoc = await this.channelStore.getChannelById()(invitation.channelId);

        // Fallback: Fetch all channels to find the one by ID
        let channel = channelDoc;
        if (!channel) {
          // Try to get from store's channels array
          const channels = this.channelStore.channels();
          channel = channels.find((ch) => ch.id === invitation.channelId);
        }

        if (!channel) {
          console.error('❌ Channel not found:', invitation.channelId);
          return;
        }

        console.log('🔄 Adding user to channel members...', {
          channelId: invitation.channelId,
          channelName: channel.name,
          isPrivate: channel.isPrivate,
          currentMembers: channel.members.length,
        });

        // Add current user to channel members
        const updatedMembers = [...new Set([...channel.members, currentUser.uid])];

        await this.channelStore.updateChannel(invitation.channelId, {
          members: updatedMembers,
        });

        console.log('✅ User successfully joined channel:', {
          channelId: invitation.channelId,
          channelName: channel.name,
          newMemberCount: updatedMembers.length,
        });

        // Wait a moment for Firestore to sync
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Navigate to channel using Router for reliable navigation
        await this.router.navigate(['/dashboard/channel/' + invitation.channelId]);
      }

      // If it's a DM invitation, create DM conversation
      if (invitation.type === 'direct-message') {
        // TODO: Create/open DM conversation with sender
        console.log('✅ User accepted DM invitation from:', invitation.senderId);
      }
    } catch (error: any) {
      console.error('❌ Error accepting invitation:', {
        error: error?.message || error,
        code: error?.code,
        invitationId: invitation.id,
      });

      // Show user-friendly error message
      alert(`Fehler beim Akzeptieren der Einladung: ${error?.message || 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    try {
      await this.invitationService.declineInvitation(invitationId);
      console.log('❌ Invitation declined:', invitationId);
    } catch (error) {
      console.error('❌ Error declining invitation:', error);
    }
  }

  /**
   * Mark all messages as read
   */
  async markAllAsRead(): Promise<void> {
    await this.mailboxStore.markAllAsRead();
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await this.mailboxStore.deleteMessage(messageId);
  }
}
