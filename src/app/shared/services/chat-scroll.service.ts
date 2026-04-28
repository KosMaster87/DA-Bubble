import { Injectable, computed, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { UserStore } from '../../stores/users/user.store';

/**
 * Conversation scroll state for auto-scroll and unread tracking
 * @description Captures per-conversation read and auto-follow flags used by unread indicators and scroll restoration.
 */
export interface ScrollState {
  /** Whether auto-scroll is enabled for this conversation */
  autoScroll: boolean;
  /** ID of the last read message */
  lastRead: string | null;
  /** Timestamp when last read */
  lastReadAt: Date | null;
}

/**
 * Cached scroll state with timestamp to prevent race conditions
 * @description Extends persisted state with cache metadata so stale Firestore echoes can be ignored safely.
 */
interface CachedScrollState extends ScrollState {
  /** Timestamp when this cache entry was created (for staleness check) */
  cachedAt: number;
}

/**
 * Service to manage scroll state per conversation (channel, thread, DM)
 * @description Maintains conversation-specific scroll and read state with optimistic caching and Firestore sync.
 * with Firestore sync for multi-device support
 */
@Injectable({
  providedIn: 'root',
})
export class ChatScrollService {
  private userStore = inject(UserStore);
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  // Local cache for optimistic updates (fixes race condition)
  // Entries have timestamps to ignore stale Firestore updates
  private localScrollCache = new Map<string, CachedScrollState>();

  // Cache lifetime: 5 seconds (Firestore should have updated by then)
  private readonly CACHE_TTL_MS = 5000;

  /**
   * Get current user's UID
   * @description Resolves the authenticated user ID once so all state mutations can guard against unauthenticated access.
   */
  private getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  /**
   * Get scroll state for all conversations as computed signal
   * @description Projects the current user's scrollState map into a reactive lookup consumed by helper methods.
   */
  private scrollStates = computed(() => {
    const users = this.userStore.users();
    const currentUserId = this.getCurrentUserId();

    if (!currentUserId) return {} as Record<string, ScrollState>;

    const currentUser = users.find((u) => u.uid === currentUserId);
    return (currentUser?.scrollState || {}) as Record<string, ScrollState>;
  });

  /**
   * Get auto-scroll state for a specific conversation
   * @description Returns effective auto-scroll preference by preferring fresh optimistic cache over persisted Firestore data.
   * @param conversationId Format: 'channel-{id}', 'thread-{id}', or 'dm-{id}'
   * @returns true if auto-scroll is enabled, defaults to true for new conversations
   */
  getAutoScroll(conversationId: string): boolean {
    // Check local cache first (optimistic update)
    const cachedState = this.localScrollCache.get(conversationId);
    if (cachedState !== undefined) {
      const age = Date.now() - cachedState.cachedAt;

      // Cache is still fresh - use it (prevents race condition with Firestore)
      if (age < this.CACHE_TTL_MS) {
        return cachedState.autoScroll;
      }

      // Cache expired - clean it up and fall through to Firestore
      this.localScrollCache.delete(conversationId);
    }

    // Fall back to Firestore state
    const state = this.scrollStates()[conversationId];
    const result = state?.autoScroll ?? true; // Default: auto-scroll ON
    return result;
  }

  /**
   * Set auto-scroll state for a specific conversation
   * @description Updates auto-scroll immediately in local cache and then persists the same state to Firestore.
   * Updates local state and syncs to Firestore
   */
  async setAutoScroll(conversationId: string, enabled: boolean): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) {
      return;
    }

    const currentStates = this.scrollStates();
    const currentState = currentStates[conversationId] || {
      autoScroll: true,
      lastRead: null,
      lastReadAt: null,
    };

    const updatedStates = {
      ...currentStates,
      [conversationId]: {
        ...currentState,
        autoScroll: enabled,
      },
    };

    // CRITICAL: Update local cache IMMEDIATELY with timestamp (fixes race condition)
    const now = Date.now();
    this.localScrollCache.set(conversationId, {
      ...currentState,
      autoScroll: enabled,
      cachedAt: now,
    });

    // Update Firestore (use setDoc with merge to create field if it doesn't exist)
    try {
      const userRef = doc(this.firestore, 'users', currentUserId);
      await setDoc(
        userRef,
        {
          scrollState: updatedStates,
        },
        { merge: true },
      );
    } catch (error) {
      // Silent error handling
    }
  }

  /**
   * Mark a message as read and update last read position
   * @description Records read position while preserving the freshest cached auto-scroll flag to avoid cache/write races.
   * @param conversationId Conversation identifier
   * @param messageId ID of the message being read
   */
  async markAsRead(conversationId: string, messageId: string): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) {
      return;
    }

    const currentStates = this.scrollStates();
    const currentState = currentStates[conversationId] || {
      autoScroll: true,
      lastRead: null,
      lastReadAt: null,
    };

    // CRITICAL: Check cache FIRST - it might have a fresher autoScroll value!
    const cachedState = this.localScrollCache.get(conversationId);
    const baseState = cachedState || currentState;

    const updatedStates = {
      ...currentStates,
      [conversationId]: {
        ...baseState, // Use cached state if available (preserves fresh autoScroll)
        lastRead: messageId,
        lastReadAt: new Date(),
      },
    };

    // Update local cache immediately with timestamp
    const now = Date.now();
    this.localScrollCache.set(conversationId, {
      ...baseState, // Use cached state to preserve autoScroll
      lastRead: messageId,
      lastReadAt: new Date(),
      cachedAt: now,
    });

    try {
      const userRef = doc(this.firestore, 'users', currentUserId);
      await setDoc(
        userRef,
        {
          scrollState: updatedStates,
        },
        { merge: true },
      );
    } catch (error) {
      // Silent error handling
    }
  }

  /**
   * Get the last read message ID for a conversation
   * @description Exposes the stored read cursor used by unread-badge and scroll-position decisions.
   * Used for unread badges and scroll positioning
   */
  getLastRead(conversationId: string): string | null {
    const state = this.scrollStates()[conversationId];
    return state?.lastRead || null;
  }

  /**
   * Check if there are unread messages in a conversation
   * @description Compares latest message ID against the stored read cursor to provide a lightweight unread predicate.
   * @param conversationId Conversation identifier
   * @param latestMessageId ID of the most recent message
   * @returns true if there are unread messages
   */
  hasUnreadMessages(conversationId: string, latestMessageId: string): boolean {
    const lastRead = this.getLastRead(conversationId);
    if (!lastRead) return true; // Never read = unread
    return lastRead !== latestMessageId;
  }

  /**
   * Reset scroll state when entering a conversation
   * @description Re-enables follow-mode and optionally marks the latest message as read when a conversation is opened.
   * Sets auto-scroll ON and marks as entering
   */
  async enterConversation(conversationId: string, latestMessageId?: string): Promise<void> {
    await this.setAutoScroll(conversationId, true);

    // Mark latest message as read when entering
    if (latestMessageId) {
      await this.markAsRead(conversationId, latestMessageId);
    }
  }

  /**
   * Get all scroll states (for debugging)
   * @description Returns the full reactive state snapshot to support diagnostics and development tooling.
   */
  getAllStates(): Record<string, ScrollState> {
    return this.scrollStates();
  }
}
