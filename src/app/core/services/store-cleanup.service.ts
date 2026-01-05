/**
 * @fileoverview Store Cleanup Service
 * @description Centralized cleanup for all store subscriptions on logout
 * @module StoreCleanupService
 */

import { Injectable, inject } from '@angular/core';
import { ChannelStore } from '@stores/channel.store';
import { UserStore } from '@stores/user.store';
import { MailboxStore } from '@stores/mailbox.store';
import { DirectMessageStore } from '@stores/direct-message.store';
import { ChannelMessageStore } from '@stores/channel-message.store';
import { ThreadStore } from '@stores/thread.store';

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
    console.log('🧹 Cleaning up all store subscriptions...');

    try {
      // Cleanup stores that have cleanup() method
      if (typeof (this.channelStore as any).cleanup === 'function') {
        (this.channelStore as any).cleanup();
      }

      if (typeof (this.userStore as any).cleanup === 'function') {
        (this.userStore as any).cleanup();
      }

      if (typeof (this.mailboxStore as any).cleanup === 'function') {
        (this.mailboxStore as any).cleanup();
      }

      // Cleanup stores that have destroy() method
      if (typeof (this.directMessageStore as any).destroy === 'function') {
        (this.directMessageStore as any).destroy();
      }

      if (typeof (this.channelMessageStore as any).destroy === 'function') {
        (this.channelMessageStore as any).destroy();
      }

      if (typeof (this.threadStore as any).destroy === 'function') {
        (this.threadStore as any).destroy();
      }

      console.log('✅ All store subscriptions cleaned up');
    } catch (error) {
      console.error('❌ Error during store cleanup:', error);
    }
  }
}
