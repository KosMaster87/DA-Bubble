/**
 * @fileoverview Dashboard Initialization Service
 * @description Handles dashboard initialization effects like message loading
 * @module shared/services/dashboard-initialization
 */

import { computed, effect, inject, Injectable, InjectionToken, Injector } from '@angular/core';
import { type Channel } from '@core/models/channel.model';
import { type DirectMessageConversation } from '@core/models/direct-message.model';
import { UnreadService } from '@core/services/unread/unread.service';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';
import { ChannelStore } from '@stores/channels/channel.store';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';

/**
 * Warmup tuning knobs for reload-time unread recovery.
 *
 * Why this exists:
 * Reload-time warmup should restore the most relevant unread/thread indicators quickly,
 * but must not open unbounded read pressure for users with many active conversations.
 */
export interface DashboardWarmupConfig {
  maxChannelWarmupCandidates: number;
  maxDmWarmupCandidates: number;
}

/**
 * Conservative defaults for portfolio-friendly read behavior.
 *
 * Why these values:
 * A small top-N keeps first-load cost predictable while still covering the freshest contexts
 * that users are most likely to open next.
 */
const DEFAULT_DASHBOARD_WARMUP_CONFIG: DashboardWarmupConfig = {
  maxChannelWarmupCandidates: 5,
  maxDmWarmupCandidates: 5,
};

/**
 * Injection token so warmup limits can be tuned without touching orchestration logic.
 *
 * Why token-based config:
 * It keeps runtime behavior centrally configurable across environments while preserving
 * a single implementation path inside the service.
 */
export const DASHBOARD_WARMUP_CONFIG = new InjectionToken<DashboardWarmupConfig>(
  'DASHBOARD_WARMUP_CONFIG',
  {
    providedIn: 'root',
    factory: (): DashboardWarmupConfig => DEFAULT_DASHBOARD_WARMUP_CONFIG,
  },
);

/**
 * Service for managing dashboard initialization and message loading effects
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardInitializationService {
  private injector = inject(Injector);
  private authStore = inject(AuthStore);
  private channelStore = inject(ChannelStore);
  private channelMessageStore = inject(ChannelMessageStore);
  private directMessageStore = inject(DirectMessageStore);
  private unreadService = inject(UnreadService);
  private warmupConfig = inject(DASHBOARD_WARMUP_CONFIG);

  private readonly preloadedChannelIds = new Set<string>();
  private readonly preloadedConversationIds = new Set<string>();
  private initialized = false;
  private activeUserId: string | null = null;

  // Computed to track only directMessages changes
  private userDirectMessages = computed(() => {
    const user = this.authStore.user();
    return user?.directMessages || [];
  });

  /**
   * Initialize dashboard effects and one-time warmup orchestration.
   *
   * Why effects are registered only once:
   * Re-registering effects on every component recreation would duplicate subscriptions and
   * warmup attempts, which can inflate reads and produce non-deterministic state updates.
   */
  initializeEffects(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    effect(
      () => {
        const userId = this.authStore.user()?.uid ?? null;

        if (userId === this.activeUserId) {
          return;
        }

        this.activeUserId = userId;
        this.preloadedChannelIds.clear();
        this.preloadedConversationIds.clear();
      },
      { injector: this.injector },
    );

    // REMOVED: Loading messages for all channels to reduce Firestore reads
    // Messages are now loaded on-demand when user opens a channel
    // This prevents 100+ unnecessary listeners and reduces costs dramatically

    // Load messages for all channels where user is a member (for thread-unread detection)
    // ❌ DISABLED: Too many Firestore reads! Only load active channel messages.
    // effect(() => {
    //   const currentUser = this.authStore.user();
    //   if (!currentUser) return;
    //
    //   const channels = this.channelStore.channels();
    //   const memberChannels = channels.filter((channel) =>
    //     channel.members.includes(currentUser.uid)
    //   );
    //
    //   memberChannels.forEach((channel) => {
    //     this.channelMessageStore.loadChannelMessages(channel.id);
    //   });
    // });

    // Watch for changes in user's directMessages array (only when IDs actually change)
    effect(
      () => {
        const directMessages = this.userDirectMessages();
        if (directMessages.length > 0) {
          this.directMessageStore.loadConversations(directMessages);
        }
      },
      { injector: this.injector },
    );

    effect(
      () => {
        const currentUser = this.authStore.user();
        if (!currentUser) return;

        const unreadChannels = this.channelStore
          .channels()
          .filter(
            (channel) =>
              !this.preloadedChannelIds.has(channel.id) &&
              this.shouldPreloadChannel(channel, currentUser.uid),
          )
          .sort(
            (a, b) =>
              this.getTimestampMillis(b.lastMessageAt) - this.getTimestampMillis(a.lastMessageAt),
          )
          .slice(0, this.getMaxChannelWarmupCandidates());

        unreadChannels.forEach((channel) => {
          this.preloadedChannelIds.add(channel.id);
          this.channelMessageStore.loadChannelMessages(channel.id, { once: true });
        });
      },
      { injector: this.injector },
    );

    // REMOVED: Loading messages for all DM conversations to reduce Firestore reads
    // Messages are now loaded on-demand when user opens a DM
    // Load messages for all DM conversations to enable thread-unread detection
    // ❌ DISABLED: Too many Firestore reads! Only load active DM messages.
    // effect(() => {
    //   const conversations = this.directMessageStore.conversations();
    //   conversations.forEach((conversation) => {
    //     this.directMessageStore.loadMessages(conversation.id);
    //   });
    // });

    effect(
      () => {
        const currentUser = this.authStore.user();
        if (!currentUser) return;

        const unreadConversations = this.directMessageStore
          .conversations()
          .filter(
            (conversation) =>
              !this.preloadedConversationIds.has(conversation.id) &&
              this.shouldPreloadConversation(conversation, currentUser.uid),
          )
          .sort(
            (a, b) =>
              this.getTimestampMillis(b.lastMessageAt) - this.getTimestampMillis(a.lastMessageAt),
          )
          .slice(0, this.getMaxDmWarmupCandidates());

        unreadConversations.forEach((conversation) => {
          this.preloadedConversationIds.add(conversation.id);
          this.directMessageStore.loadMessages(conversation.id, { once: true });
        });
      },
      { injector: this.injector },
    );
  }

  /**
   * Determine whether a channel is a warmup candidate.
   *
   * Why this guard exists:
   * Warmup should prioritize channels where unread state can visibly affect sidebar badges,
   * instead of preloading all memberships.
   */
  private shouldPreloadChannel(channel: Channel, currentUserId: string): boolean {
    if (!channel.members.includes(currentUserId)) {
      return false;
    }

    return this.unreadService.hasUnread(channel.id, channel.lastMessageAt);
  }

  /**
   * Determine whether a DM conversation is a warmup candidate.
   *
   * Why the fallback check is included:
   * Some DM cases carry unread thread activity without normal conversation unread;
   * this preserves those thread-only scenarios after reload.
   */
  private shouldPreloadConversation(
    conversation: DirectMessageConversation,
    currentUserId: string,
  ): boolean {
    if (!conversation.participants.includes(currentUserId)) {
      return false;
    }

    return (
      this.unreadService.hasUnread(conversation.id, conversation.lastMessageAt) ||
      this.unreadService.hasPotentialThreadUnreadActivity(
        conversation.id,
        conversation.lastMessageAt,
      )
    );
  }

  /**
   * Normalize optional timestamps for stable warmup prioritization.
   *
   * Why `undefined` maps to 0:
   * Entries with missing activity timestamps should never outrank fresh activity,
   * but still remain sortable without special-case branches.
   */
  private getTimestampMillis(timestamp?: Date): number {
    return timestamp?.getTime() ?? 0;
  }

  /**
   * Guard warmup candidate configuration from invalid values.
   *
   * Why this defensive clamp is needed:
   * Misconfigured zero/negative/NaN values could silently disable warmup and regress
   * reload UX, so we enforce a safe lower bound.
   */
  private sanitizeCandidateLimit(limit: number): number {
    return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;
  }

  /**
   * Resolve maximum number of channel warmup candidates.
   *
   * Why this indirection exists:
   * It centralizes config sanitization and avoids repeating guard logic at call sites.
   */
  private getMaxChannelWarmupCandidates(): number {
    return this.sanitizeCandidateLimit(this.warmupConfig.maxChannelWarmupCandidates);
  }

  /**
   * Resolve maximum number of direct-message warmup candidates.
   *
   * Why this indirection exists:
   * Same reasoning as channels: one source for validated limits keeps warmup behavior
   * consistent across both pipelines.
   */
  private getMaxDmWarmupCandidates(): number {
    return this.sanitizeCandidateLimit(this.warmupConfig.maxDmWarmupCandidates);
  }
}
