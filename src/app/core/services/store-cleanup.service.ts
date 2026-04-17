/**
 * @fileoverview Store Cleanup Service
 * @description Centralized cleanup for all store subscriptions on logout
 * @module StoreCleanupService
 */

import { Injectable, inject } from '@angular/core';
import { ChannelStore } from '@stores/channels/channel.store';
import { UserStore } from '@stores/users/user.store';
import { MailboxStore } from '@stores/mailbox/mailbox.store';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';
import { ThreadStore } from '@stores/threads/thread.store';
import type { CleanableStore, DestroyableStore } from '@stores/core/store.types';

/**
 * Service to cleanup all store subscriptions
 * Called on user logout to prevent permission errors
 */
@Injectable({
  providedIn: 'root',
})
export class StoreCleanupService {
  private channelStore = inject(ChannelStore);
  private userStore = inject(UserStore);
  private mailboxStore = inject(MailboxStore);
  private directMessageStore = inject(DirectMessageStore);
  private channelMessageStore = inject(ChannelMessageStore);
  private threadStore = inject(ThreadStore);

  /**
   * Cleanup all store subscriptions
   * Should be called before user logout to prevent Firebase permission errors
   */
  cleanupAll(): void {
    try {
      // Cleanup stores that have cleanup() method
      (this.channelStore as unknown as CleanableStore).cleanup();
      (this.userStore as unknown as CleanableStore).cleanup();
      (this.mailboxStore as unknown as CleanableStore).cleanup();

      // Cleanup stores that have destroy() method
      (this.directMessageStore as unknown as DestroyableStore).destroy();
      (this.channelMessageStore as unknown as DestroyableStore).destroy();
      (this.threadStore as unknown as DestroyableStore).destroy();
    } catch (error) {
      console.error('❌ Error during store cleanup:', error);
    }
  }
}
