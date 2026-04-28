/**
 * @fileoverview Mailbox Badge Service
 * @description Aggregates mailbox unread counts and pending invitations into reactive badge signals for header and sidebar surfaces.
 * @module core/services/mailbox-badge
 */

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { type Invitation } from '@core/models/invitation.model';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { AuthStore } from '@stores/auth';
import { MailboxStore } from '@stores/index';

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
   * @description Readonly signal exposing the live list of pending invitations so templates can react without write access.
   */
  readonly pendingInvitations = this._pendingInvitations.asReadonly();

  /**
   * Check if mailbox has unread messages or pending invitations
   * @description Combined unread flag used to show the mailbox badge dot — true whenever there are unread messages or at least one pending invitation.
   */
  readonly hasUnread = computed(() => {
    const unreadMessagesCount = this.mailboxStore.unreadCount();
    const pendingInvitationsCount = this._pendingInvitations().length;
    return unreadMessagesCount > 0 || pendingInvitationsCount > 0;
  });

  /**
   * Total count of unread items (messages + invitations)
   * @description Sums mailbox unread messages and pending invitations into a single number for the badge counter.
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
          },
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
   * @description Cancels the Firestore invitation listener to prevent memory leaks and stale callbacks after logout.
   */
  private cleanup(): void {
    if (this.invitationUnsubscribe) {
      this.invitationUnsubscribe();
      this.invitationUnsubscribe = null;
    }
  }
}
