/**
 * @fileoverview Mailbox Badge Service
 * @description Manages mailbox badge state (unread messages + pending invitations)
 * @module core/services/mailbox-badge
 */

import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { MailboxStore } from '@stores/index';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { type Invitation } from '@core/models/invitation.model';

@Injectable({
  providedIn: 'root',
})
export class MailboxBadgeService {
  private authStore = inject(AuthStore);
  private mailboxStore = inject(MailboxStore);
  private invitationService = inject(InvitationService);

  private _pendingInvitations = signal<Invitation[]>([]);
  private invitationUnsubscribe: (() => void) | null = null;

  /**
   * Pending invitations for the current user
   */
  readonly pendingInvitations = this._pendingInvitations.asReadonly();

  /**
   * Check if mailbox has unread messages or pending invitations
   */
  readonly hasUnread = computed(() => {
    const unreadMessagesCount = this.mailboxStore.unreadCount();
    const pendingInvitationsCount = this._pendingInvitations().length;
    return unreadMessagesCount > 0 || pendingInvitationsCount > 0;
  });

  /**
   * Total count of unread items (messages + invitations)
   */
  readonly unreadCount = computed(() => {
    const unreadMessagesCount = this.mailboxStore.unreadCount();
    const pendingInvitationsCount = this._pendingInvitations().length;
    return unreadMessagesCount + pendingInvitationsCount;
  });

  constructor() {
    // Subscribe to pending invitations when user changes
    effect(() => {
      const currentUser = this.authStore.user();

      if (currentUser?.uid) {
        // Unsubscribe from previous listener
        this.cleanup();

        // Subscribe to pending invitations
        this.invitationUnsubscribe = this.invitationService.subscribeToPendingInvitations(
          currentUser.uid,
          (invitations) => {
            this._pendingInvitations.set(invitations);
          }
        );
      } else {
        // Clear invitations when user logs out
        this.cleanup();
        this._pendingInvitations.set([]);
      }
    });
  }

  /**
   * Cleanup subscription
   */
  private cleanup(): void {
    if (this.invitationUnsubscribe) {
      this.invitationUnsubscribe();
      this.invitationUnsubscribe = null;
    }
  }
}
