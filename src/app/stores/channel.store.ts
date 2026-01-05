/**
 * @fileoverview Channel management store with NgRx SignalStore
 * Provides state management for channel CRUD operations, member management,
 * and channel subscriptions with Firebase Firestore integration.
 * @description This store handles all channel-related operations including creation,
 * updates, deletion, member management, and real-time channel subscriptions.
 * @module ChannelStore
 */

import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  arrayRemove,
} from '@angular/fire/firestore';

import { Channel, CreateChannelRequest } from '@core/models/channel.model';

/**
 * State interface for channel management
 * @interface ChannelState
 */
export interface ChannelState {
  channels: Channel[];
  selectedChannel: Channel | null;
  myChannels: Channel[];
  publicChannels: Channel[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial channel state
 * @constant {ChannelState}
 */
const initialState: ChannelState = {
  channels: [],
  selectedChannel: null,
  myChannels: [],
  publicChannels: [],
  isLoading: false,
  error: null,
};

/**
 * Channel management store with Firestore integration
 * Provides methods for channel CRUD operations and member management
 * @constant {SignalStore}
 */
export const ChannelStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Computed property for total channel count
     * @returns {Signal<number>} Number of channels
     */
    channelCount: computed(() => store.channels().length),

    /**
     * Computed property for user channel count
     * @returns {Signal<number>} Number of user's channels
     */
    userChannelCount: computed(() => store.myChannels().length),

    /**
     * Computed function to get channel by ID
     * @returns {Signal<Function>} Function that takes id and returns channel or undefined
     */
    getChannelById: computed(
      () => (id: string) => store.channels().find((channel) => channel.id === id)
    ),

    /**
     * Computed function to get public channels
     * @returns {Signal<Function>} Function that returns array of public channels
     */
    getPublicChannels: computed(() => store.channels().filter((channel) => !channel.isPrivate)),

    /**
     * Computed function to get private channels
     * @returns {Signal<Function>} Function that returns array of private channels
     */
    getPrivateChannels: computed(() => store.channels().filter((channel) => channel.isPrivate)),
  })),
  withMethods((store) => {
    const firestore = inject(Firestore);
    const channelsCollection = collection(firestore, 'channels');
    let unsubscribe: (() => void) | null = null;

    return {
      // === ENTRY POINT METHODS ===

      /**
       * Entry point: Load all channels or user-specific channels with real-time updates
       * @async
       * @function loadChannels
       * @param {string} userId - Optional user ID to filter channels
       * @returns {Promise<void>}
       */
      async loadChannels(userId?: string) {
        await this.performLoad(userId);
      },

      /**
       * Entry point: Create new channel
       * @async
       * @function createChannel
       * @param {CreateChannelRequest} channelData - Channel data to create
       * @param {string} createdBy - User ID of channel creator
       * @returns {Promise<string>} - The ID of the created channel
       */
      async createChannel(channelData: CreateChannelRequest, createdBy: string): Promise<string> {
        return await this.performCreate(channelData, createdBy);
      },

      /**
       * Entry point: Update channel data
       * @async
       * @function updateChannel
       * @param {string} channelId - Channel ID to update
       * @param {Partial<Channel>} updates - Data to update
       * @returns {Promise<void>}
       */
      async updateChannel(channelId: string, updates: Partial<Channel>) {
        await this.performUpdate(channelId, updates);
      },

      /**
       * Entry point: Leave channel (remove user from members)
       * @async
       * @function leaveChannel
       * @param {string} channelId - Channel ID to leave
       * @param {string} userId - User ID who wants to leave
       * @returns {Promise<void>}
       */
      async leaveChannel(channelId: string, userId: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const channel = store.getChannelById()(channelId);
          if (!channel) {
            throw new Error('Channel not found');
          }

          // Check if user is the owner/creator
          if (channel.createdBy === userId) {
            throw new Error('Channel owner cannot leave the channel');
          }

          // Remove user from members array
          const channelDoc = doc(channelsCollection, channelId);
          await updateDoc(channelDoc, {
            members: arrayRemove(userId),
            updatedAt: new Date(),
          });

          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to leave channel');
          throw error;
        }
      },

      /**
       * Entry point: Delete channel (only owner)
       * @async
       * @function deleteChannel
       * @param {string} channelId - Channel ID to delete
       * @returns {Promise<void>}
       */
      async deleteChannel(channelId: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const channel = store.getChannelById()(channelId);
          if (!channel) {
            throw new Error('Channel not found');
          }

          // Delete channel document from Firestore
          const channelDoc = doc(channelsCollection, channelId);
          await deleteDoc(channelDoc);
          // onSnapshot listener will automatically remove it from state

          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to delete channel');
          throw error;
        }
      },

      // === IMPLEMENTATION METHODS ===

      /** with real-time listener
       * @async
       * @function performLoad
       * @param {string} userId - Optional user ID to filter channels
       * @returns {Promise<void>}
       */
      async performLoad(userId?: string) {
        // Unsubscribe from previous listener if exists
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        patchState(store, { isLoading: true });
        try {
          // Set up real-time listener for channels
          const q = query(channelsCollection, orderBy('createdAt', 'desc'));

          unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const channels = this.mapChannelsFromSnapshot(snapshot);
              const userChannels = this.filterUserChannels(channels, userId);
              patchState(store, {
                channels,
                myChannels: userChannels,
                isLoading: false,
                error: null,
              });
            },
            (error: any) => {
              // Auto-cleanup on permission error (user logged out)
              if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
                console.log('🔓 Permission error detected - cleaning up channel subscription');
                if (unsubscribe) {
                  unsubscribe();
                  unsubscribe = null;
                }
                patchState(store, initialState);
                return;
              }
              console.error('Error in channels listener:', error);
              this.handleError(error, 'Failed to load channels');
            }
          );
        } catch (error) {
          this.handleError(error, 'Failed to load channels');
        }
      },

      /**
       * Cleanup when store is destroyed
       */
      cleanup(): void {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        patchState(store, initialState);
      },

      /**
       * Implementation: Create new channel in Firestore
       * @async
       * @function performCreate
       * @param {CreateChannelRequest} channelData - Channel data to create
       * @param {string} createdBy - User ID of channel creator
       * @returns {Promise<string>} - The ID of the created channel
       */
      async performCreate(channelData: CreateChannelRequest, createdBy: string): Promise<string> {
        patchState(store, { isLoading: true, error: null });
        try {
          const newChannel = this.buildChannelData(channelData, createdBy);
          const docRef = await addDoc(channelsCollection, newChannel);
          // Don't add to state manually - let the onSnapshot listener handle it
          // This prevents duplicate channels
          patchState(store, { isLoading: false });
          return docRef.id;
        } catch (error) {
          this.handleError(error, 'Failed to create channel');
          throw error;
        }
      },

      /**
       * Implementation: Update channel in Firestore
       * @async
       * @function performUpdate
       * @param {string} channelId - Channel ID to update
       * @param {Partial<Channel>} updates - Data to update
       * @returns {Promise<void>}
       */
      async performUpdate(channelId: string, updates: Partial<Channel>) {
        try {
          console.log('🔄 performUpdate called:', { channelId, updates });
          const channelDoc = doc(channelsCollection, channelId);
          console.log('📝 Channel doc path:', channelDoc.path);
          await updateDoc(channelDoc, { ...updates, updatedAt: new Date() });
          console.log('✅ Channel updated in Firestore:', channelId, updates);
          this.updateChannelInState(channelId, updates);
        } catch (error) {
          this.handleError(error, 'Failed to update channel');
          throw error; // Re-throw so caller knows update failed
        }
      },

      // === HELPER FUNCTIONS ===

      /**
       * Map Firestore snapshot to Channel array
       * @function mapChannelsFromSnapshot
       * @param {any} snapshot - Firestore query snapshot
       * @returns {Channel[]} Array of channel objects
       */
      mapChannelsFromSnapshot(snapshot: any): Channel[] {
        const channels = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamps to Date objects
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            lastMessageAt: data.lastMessageAt?.toDate?.() || new Date(),
          } as Channel;
        });

        // Deduplicate channels by ID (just in case)
        const uniqueChannels = channels.reduce((acc: Channel[], channel: Channel) => {
          const exists = acc.find((c) => c.id === channel.id);
          if (!exists) {
            acc.push(channel);
          }
          return acc;
        }, []);

        return uniqueChannels;
      },

      /**
       * Filter channels by user membership
       * @function filterUserChannels
       * @param {Channel[]} channels - Array of all channels
       * @param {string} userId - Optional user ID to filter by
       * @returns {Channel[]} Filtered array of user channels
       */
      filterUserChannels(channels: Channel[], userId?: string): Channel[] {
        return userId ? channels.filter((ch) => ch.members.includes(userId)) : [];
      },

      /**
       * Build complete channel data with defaults
       * @function buildChannelData
       * @param {CreateChannelRequest} channelData - Basic channel data
       * @param {string} createdBy - User ID of creator
       * @returns {Omit<Channel, 'id'>} Complete channel data without ID
       */
      buildChannelData(channelData: CreateChannelRequest, createdBy: string): Omit<Channel, 'id'> {
        const now = new Date();
        // Ensure creator is in members array, but avoid duplicates
        const uniqueMembers = channelData.members.includes(createdBy)
          ? channelData.members
          : [...channelData.members, createdBy];
        return {
          ...channelData,
          createdBy,
          admins: [createdBy],
          members: uniqueMembers,
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now,
          messageCount: 0,
        };
      },

      /**
       * Find channel by ID in state
       * @function findChannelById
       * @param {string} channelId - Channel ID to find
       * @returns {Channel} Channel object
       * @throws {Error} If channel not found
       */
      findChannelById(channelId: string): Channel {
        const channel = store.channels().find((ch) => ch.id === channelId);
        if (!channel) throw new Error('Channel not found');
        return channel;
      },

      /**
       * Update channel in local state
       * @function updateChannelInState
       * @param {string} channelId - Channel ID to update
       * @param {Partial<Channel>} updates - Updates to apply
       */
      updateChannelInState(channelId: string, updates: Partial<Channel>) {
        patchState(store, {
          channels: store
            .channels()
            .map((channel) => (channel.id === channelId ? { ...channel, ...updates } : channel)),
          error: null,
        });
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

      // === STATE MANAGEMENT HELPERS ===

      /**
       * Set all channels in state
       * @function setChannels
       * @param {Channel[]} channels - Array of channels to set
       */
      setChannels(channels: Channel[]) {
        patchState(store, { channels, error: null });
      },

      /**
       * Select channel for detailed view
       * @function selectChannel
       * @param {Channel | null} channel - Channel to select or null to deselect
       */
      selectChannel(channel: Channel | null) {
        patchState(store, { selectedChannel: channel });
      },

      /**
       * Set user's channels in state
       * @function setUserChannels
       * @param {Channel[]} userChannels - Array of user channels
       */
      setUserChannels(userChannels: Channel[]) {
        patchState(store, { myChannels: userChannels, error: null });
      },

      /**
       * Set loading state
       * @function setLoading
       * @param {boolean} isLoading - Loading state
       */
      setLoading(isLoading: boolean) {
        patchState(store, { isLoading });
      },

      /**
       * Set error message
       * @function setError
       * @param {string | null} error - Error message or null to clear
       */
      setError(error: string | null) {
        patchState(store, { error });
      },

      /**
       * Clear error message
       * @function clearError
       */
      clearError() {
        patchState(store, { error: null });
      },
    };
  })
);
