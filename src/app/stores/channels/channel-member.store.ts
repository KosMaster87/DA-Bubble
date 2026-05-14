/**
 * @fileoverview Channel member management store with NgRx SignalStore
 * Provides state management for channel member operations including
 * adding/removing members, admin management, and membership checks.
 * @description This store handles all channel member-related operations including
 * member addition, removal, admin promotion, and membership status tracking.
 * @module channel-member
 */

import { computed, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Channel } from '@core/models/channel.model';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

/**
 * State interface for channel member management
 * @description Keeps member-management state separate from the main channel state
 * so member operations can be in flight without affecting channel list rendering.
 * @interface ChannelMemberState
 */
export interface ChannelMemberState {
  activeChannelId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial channel member state
 * @description Defines the zero-state baseline used on store initialization and
 * after cleanup resets to guarantee a predictable starting point.
 * @constant {ChannelMemberState}
 */
const initialState: ChannelMemberState = {
  activeChannelId: null,
  isLoading: false,
  error: null,
};

/**
 * Channel member management store with Firestore integration
 * Provides methods for member and admin operations
 * @description Dedicated store for membership mutations so member-write operations
 * do not mix with read/subscription logic that lives in the main ChannelStore.
 * @constant {SignalStore}
 */
export const ChannelMemberStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Computed property to check if currently loading
     * @description Exposes loading state under a friendlier alias so templates
     * bind to `loading` instead of the raw `isLoading` signal.
     * @returns {Signal<boolean>} Loading status
     */
    loading: computed(() => store.isLoading()),

    /**
     * Computed property to get active channel ID
     * @description Provides a named signal for the active channel context so member
     * operations can target the correct channel without additional params.
     * @returns {Signal<string | null>} Active channel ID or null
     */
    activeChannel: computed(() => store.activeChannelId()),
  })),
  withMethods((store) => {
    const firestore = inject(Firestore);
    const channelsCollection = collection(firestore, 'channels');

    return {
      /**
       * Add member to channel
       * @description Reads the current member list before appending so the write is
       * idempotent-safe without requiring a Firestore arrayUnion call.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to add
       * @returns {Promise<void>}
       */
      async addMember(channelId: string, userId: string): Promise<void> {
        await this.executeChannelMemberOperation(async () => {
          const channel = await this.getChannelById(channelId);
          await this.updateChannelMembers(channelId, [...channel.members, userId]);
        }, 'Failed to add member');
      },

      /**
       * Remove member from channel
       * @description Filters the existing member array client-side before writing so
       * removal is consistent and avoids a Firestore arrayRemove race condition.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to remove
       * @returns {Promise<void>}
       */
      async removeMember(channelId: string, userId: string): Promise<void> {
        await this.executeChannelMemberOperation(async () => {
          const channel = await this.getChannelById(channelId);
          await this.updateChannelMembers(
            channelId,
            channel.members.filter((id) => id !== userId),
          );
        }, 'Failed to remove member');
      },

      /**
       * Add admin to channel
       * @description Mirrors the member-add pattern for admin promotion so both
       * operations use identical Firestore write mechanics.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to promote to admin
       * @returns {Promise<void>}
       */
      async addAdmin(channelId: string, userId: string): Promise<void> {
        await this.executeChannelMemberOperation(async () => {
          const channel = await this.getChannelById(channelId);
          await this.updateChannelAdmins(channelId, [...channel.admins, userId]);
        }, 'Failed to add admin');
      },

      /**
       * Remove admin from channel
       * @description Demotes a user by filtering the admin array and persisting the
       * result, keeping admin management symmetric with member management.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to demote from admin
       * @returns {Promise<void>}
       */
      async removeAdmin(channelId: string, userId: string): Promise<void> {
        await this.executeChannelMemberOperation(async () => {
          const channel = await this.getChannelById(channelId);
          await this.updateChannelAdmins(
            channelId,
            channel.admins.filter((id) => id !== userId),
          );
        }, 'Failed to remove admin');
      },

      /**
       * Check if user is member of channel
       * @description Reads fresh Firestore data for the check so membership status
       * is authoritative even if local state has not been updated yet.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to check
       * @returns {Promise<boolean>} True if user is member
       */
      async isUserMember(channelId: string, userId: string): Promise<boolean> {
        try {
          const channel = await this.getChannelById(channelId);
          return channel.members.includes(userId);
        } catch (error) {
          this.handleError(error, 'Failed to check membership');
          return false;
        }
      },

      /**
       * Check if user is admin of channel
       * @description Provides an authoritative admin check from Firestore to guard
       * admin-only UI actions without relying on potentially stale local state.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to check
       * @returns {Promise<boolean>} True if user is admin
       */
      async isUserAdmin(channelId: string, userId: string): Promise<boolean> {
        try {
          const channel = await this.getChannelById(channelId);
          return channel.admins.includes(userId);
        } catch (error) {
          this.handleError(error, 'Failed to check admin status');
          return false;
        }
      },

      // === HELPER FUNCTIONS ===

      /**
       * Get channel by ID from Firestore
       * @description Fetches the latest channel document directly from Firestore so
       * member operations always act on current data rather than a cached snapshot.
       * @async
       * @param {string} channelId - Channel ID
       * @returns {Promise<Channel>} Channel object
       * @throws {Error} If channel not found
       */
      async getChannelById(channelId: string): Promise<Channel> {
        const channelDoc = doc(channelsCollection, channelId);
        const snapshot = await getDoc(channelDoc);
        if (!snapshot.exists()) {
          throw new Error('Channel not found');
        }
        return { id: snapshot.id, ...snapshot.data() } as Channel;
      },

      /**
       * Update channel members in Firestore
       * @description Centralized write helper so all member-array mutations go through
       * one function with a consistent `updatedAt` timestamp.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string[]} members - Updated members array
       * @returns {Promise<void>}
       */
      async updateChannelMembers(channelId: string, members: string[]): Promise<void> {
        const channelDoc = doc(channelsCollection, channelId);
        await updateDoc(channelDoc, { members, updatedAt: new Date() });
      },

      /**
       * Update channel admins in Firestore
       * @description Mirrors `updateChannelMembers` for the admins array so both
       * lists are written with identical patterns and timestamp semantics.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string[]} admins - Updated admins array
       * @returns {Promise<void>}
       */
      async updateChannelAdmins(channelId: string, admins: string[]): Promise<void> {
        const channelDoc = doc(channelsCollection, channelId);
        await updateDoc(channelDoc, { admins, updatedAt: new Date() });
      },

      /**
       * Execute shared channel-member operation flow.
       * @description Wraps loading state management and error handling so individual
       * member operations only express their specific Firestore mutation logic.
       * @async
       * @param {() => Promise<void>} operation - Async Firestore mutation to execute
       * @param {string} defaultMessage - Fallback error message shown when the operation fails
       * @returns {Promise<void>}
       */
      async executeChannelMemberOperation(
        operation: () => Promise<void>,
        defaultMessage: string,
      ): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          await operation();
          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, defaultMessage);
        }
      },

      /**
       * Normalize and store an operation error.
       * @description Extracts a human-readable message from any thrown value and writes
       * it to store state so UI error displays stay consistent across member operations.
       * @param {unknown} error - Error object thrown by a failed operation
       * @param {string} defaultMessage - Fallback message used when the error carries no message
       * @returns {void}
       */
      handleError(error: unknown, defaultMessage: string): void {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      // === STATE MANAGEMENT ===

      /**
       * Set the active channel ID.
       * @description Persists the currently open channel into store state so route and
       * panel components can react to channel selection changes.
       * @param {string | null} channelId - ID of the channel to activate, or null to clear
       * @returns {void}
       */
      setActiveChannel: (channelId: string | null) =>
        patchState(store, { activeChannelId: channelId }),

      /**
       * Set the loading state.
       * @description Allows callers to control the shared loading flag directly when
       * the operation wrapper is bypassed for synchronous or fire-and-forget mutations.
       * @param {boolean} isLoading - True while an async operation is in progress
       * @returns {void}
       */
      setLoading: (isLoading: boolean) => patchState(store, { isLoading }),

      /**
       * Set an error message.
       * @description Writes an explicit error string to store state so UI components
       * can surface it without triggering a full operation flow.
       * @param {string | null} error - Error message to display, or null to clear
       * @returns {void}
       */
      setError: (error: string | null) => patchState(store, { error }),

      /**
       * Clear the current error message.
       * @description Resets the error field to null so error banners or inline messages
       * dismiss correctly after a user action or a successful retry.
       * @returns {void}
       */
      clearError: () => patchState(store, { error: null }),
    };
  }),
);
