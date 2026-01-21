/**
 * @fileoverview Channel member management store with NgRx SignalStore
 * Provides state management for channel member operations including
 * adding/removing members, admin management, and membership checks.
 * @description This store handles all channel member-related operations including
 * member addition, removal, admin promotion, and membership status tracking.
 * @module ChannelMemberStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { Firestore, collection, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { Channel } from '@core/models/channel.model';

/**
 * State interface for channel member management
 * @interface ChannelMemberState
 */
export interface ChannelMemberState {
  activeChannelId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial channel member state
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
 * @constant {SignalStore}
 */
export const ChannelMemberStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Computed property to check if currently loading
     * @returns {Signal<boolean>} Loading status
     */
    loading: computed(() => store.isLoading()),

    /**
     * Computed property to get active channel ID
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
       * @async
       * @function addMember
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to add
       * @returns {Promise<void>}
       */
      async addMember(channelId: string, userId: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const channel = await this.getChannelById(channelId);
          await this.updateChannelMembers(channelId, [...channel.members, userId]);
          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to add member');
        }
      },

      /**
       * Remove member from channel
       * @async
       * @function removeMember
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to remove
       * @returns {Promise<void>}
       */
      async removeMember(channelId: string, userId: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const channel = await this.getChannelById(channelId);
          await this.updateChannelMembers(channelId, channel.members.filter((id) => id !== userId));
          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to remove member');
        }
      },

      /**
       * Add admin to channel
       * @async
       * @function addAdmin
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to promote to admin
       * @returns {Promise<void>}
       */
      async addAdmin(channelId: string, userId: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const channel = await this.getChannelById(channelId);
          await this.updateChannelAdmins(channelId, [...channel.admins, userId]);
          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to add admin');
        }
      },

      /**
       * Remove admin from channel
       * @async
       * @function removeAdmin
       * @param {string} channelId - Channel ID
       * @param {string} userId - User ID to demote from admin
       * @returns {Promise<void>}
       */
      async removeAdmin(channelId: string, userId: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const channel = await this.getChannelById(channelId);
          await this.updateChannelAdmins(channelId, channel.admins.filter((id) => id !== userId));
          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to remove admin');
        }
      },

      /**
       * Check if user is member of channel
       * @async
       * @function isUserMember
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
       * @async
       * @function isUserAdmin
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
       * @async
       * @function getChannelById
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
       * @async
       * @function updateChannelMembers
       * @param {string} channelId - Channel ID
       * @param {string[]} members - Updated members array
       * @returns {Promise<void>}
       */
      async updateChannelMembers(channelId: string, members: string[]) {
        const channelDoc = doc(channelsCollection, channelId);
        await updateDoc(channelDoc, { members, updatedAt: new Date() });
      },

      /**
       * Update channel admins in Firestore
       * @async
       * @function updateChannelAdmins
       * @param {string} channelId - Channel ID
       * @param {string[]} admins - Updated admins array
       * @returns {Promise<void>}
       */
      async updateChannelAdmins(channelId: string, admins: string[]) {
        const channelDoc = doc(channelsCollection, channelId);
        await updateDoc(channelDoc, { admins, updatedAt: new Date() });
      },

      /**
       * Handle errors and update state
       * @function handleError
       * @param {unknown} error - Error object
       * @param {string} defaultMessage - Default error message
       */
      handleError(error: unknown, defaultMessage: string) {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      // === STATE MANAGEMENT ===

      /** Set active channel ID @function setActiveChannel @param {string | null} channelId */
      setActiveChannel: (channelId: string | null) => patchState(store, { activeChannelId: channelId }),

      /** Set loading state @function setLoading @param {boolean} isLoading */
      setLoading: (isLoading: boolean) => patchState(store, { isLoading }),

      /** Set error message @function setError @param {string | null} error */
      setError: (error: string | null) => patchState(store, { error }),

      /** Clear error message @function clearError */
      clearError: () => patchState(store, { error: null }),
    };
  })
);
