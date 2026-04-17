/**
 * @fileoverview Channel management store with NgRx SignalStore
 * Provides state management for channel CRUD operations, member management,
 * and channel subscriptions with Firebase Firestore integration.
 * @description This store handles all channel-related operations including creation,
 * updates, deletion, member management, and real-time channel subscriptions.
 * @module ChannelStore
 */

import { computed, inject } from '@angular/core';
import { Channel, CreateChannelRequest } from '@core/models/channel.model';
import { ChannelListenerService } from '@core/services/channel-listener/channel-listener.service';
import { ChannelOperationsService } from '@core/services/channel-operations/channel-operations.service';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ChannelStateHelper } from '../helpers/channel-state.helper';

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
      () => (id: string) => store.channels().find((channel) => channel.id === id),
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
    const operations = inject(ChannelOperationsService);
    const listener = inject(ChannelListenerService);

    return {
      // === ENTRY POINT METHODS ===

      /**
       * Entry point: Load all channels
       * @param userId - Optional user ID to filter
       */
      async loadChannels(userId?: string): Promise<void> {
        this.performLoad(userId);
      },

      /**
       * Entry point: Create new channel
       * @param channelData - Channel data
       * @param createdBy - Creator user ID
       * @returns Channel ID
       */
      async createChannel(channelData: CreateChannelRequest, createdBy: string): Promise<string> {
        return await this.performCreate(channelData, createdBy);
      },

      /**
       * Entry point: Update channel
       * @param channelId - Channel ID
       * @param updates - Updates to apply
       */
      async updateChannel(channelId: string, updates: Partial<Channel>): Promise<void> {
        await this.performUpdate(channelId, updates);
      },

      /**
       * Entry point: Leave channel
       * @param channelId - Channel ID
       * @param userId - User ID
       */
      async leaveChannel(channelId: string, userId: string): Promise<void> {
        await this.performLeaveChannel(channelId, userId);
      },

      /**
       * Entry point: Delete channel
       * @param channelId - Channel ID
       */
      async deleteChannel(channelId: string): Promise<void> {
        await this.performDeleteChannel(channelId);
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Load channels
       * @param userId - User ID for filtering
       */
      performLoad(userId?: string): void {
        patchState(store, { isLoading: true });
        listener.setupListener(
          (channels) => this.handleChannelsLoaded(channels, userId),
          (error) => this.handleError(error, 'Failed to load channels'),
        );
      },

      /**
       * Implementation: Create channel
       * @param channelData - Channel data
       * @param createdBy - Creator ID
       * @returns Channel ID
       */
      async performCreate(channelData: CreateChannelRequest, createdBy: string): Promise<string> {
        return await this.executeChannelOperation(
          () => operations.createChannel(channelData, createdBy),
          'Failed to create channel',
          true,
        );
      },

      /**
       * Implementation: Update channel
       * @param channelId - Channel ID
       * @param updates - Updates to apply
       */
      async performUpdate(channelId: string, updates: Partial<Channel>): Promise<void> {
        await this.executeChannelOperation(
          () => operations.updateChannel(channelId, updates),
          'Failed to update channel',
          false,
          () => this.updateChannelInState(channelId, updates),
        );
      },

      /**
       * Implementation: Leave channel
       * @param channelId - Channel ID
       * @param userId - User ID
       */
      async performLeaveChannel(channelId: string, userId: string): Promise<void> {
        await this.executeChannelOperation(
          async () => {
            this.validateLeaveChannel(channelId, userId);
            return await operations.removeUserFromChannel(channelId, userId);
          },
          'Failed to leave channel',
          true,
        );
      },

      /**
       * Implementation: Delete channel
       * @param channelId - Channel ID
       */
      async performDeleteChannel(channelId: string): Promise<void> {
        await this.executeChannelOperation(
          async () => {
            this.validateChannelExists(channelId);
            return await operations.deleteChannel(channelId);
          },
          'Failed to delete channel',
          true,
        );
      },

      // === HELPER METHODS ===

      /**
       * Handle channels loaded from listener
       * @param channels - Loaded channels
       * @param userId - User ID for filtering
       */
      handleChannelsLoaded(channels: Channel[], userId?: string): void {
        const userChannels = ChannelStateHelper.filterUserChannels(channels, userId);
        patchState(store, {
          channels,
          myChannels: userChannels,
          isLoading: false,
          error: null,
        });
      },

      /**
       * Validate channel exists
       * @param channelId - Channel ID
       */
      validateChannelExists(channelId: string): void {
        this.getChannelOrThrow(channelId);
      },

      /**
       * Validate user can leave channel
       * @param channelId - Channel ID
       * @param userId - User ID
       */
      validateLeaveChannel(channelId: string, userId: string): void {
        const channel = this.getChannelOrThrow(channelId);
        if (ChannelStateHelper.isChannelOwner(channel, userId)) {
          throw new Error('Channel owner cannot leave the channel');
        }
      },

      /**
       * Get channel by ID or throw a not-found error.
       */
      getChannelOrThrow(channelId: string): Channel {
        const channel = store.getChannelById()(channelId);
        if (!channel) throw new Error('Channel not found');
        return channel;
      },

      /**
       * Update channel in state
       * @param channelId - Channel ID
       * @param updates - Updates to apply
       */
      updateChannelInState(channelId: string, updates: Partial<Channel>): void {
        const updated = ChannelStateHelper.updateChannelInArray(
          store.channels(),
          channelId,
          updates,
        );
        patchState(store, { channels: updated, error: null });
      },

      /**
       * Handle errors
       * @param error - Error object
       * @param defaultMessage - Default message
       */
      handleError(error: unknown, defaultMessage: string): void {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      /**
       * Execute channel operation with shared loading and error handling.
       */
      async executeChannelOperation<T>(
        operation: () => Promise<T>,
        defaultMessage: string,
        withLoadingState = false,
        onSuccess?: () => void,
      ): Promise<T> {
        if (withLoadingState) {
          this.startOperationLoading();
        }

        try {
          const result = await operation();
          this.completeChannelOperation(withLoadingState, onSuccess);
          return result;
        } catch (error) {
          this.handleError(error, defaultMessage);
          throw error;
        }
      },

      /**
       * Apply shared successful channel operation effects.
       */
      completeChannelOperation(withLoadingState: boolean, onSuccess?: () => void): void {
        onSuccess?.();
        if (withLoadingState) {
          this.finishOperationLoading();
        }
      },

      /**
       * Mark channel operation loading start.
       */
      startOperationLoading(): void {
        patchState(store, { isLoading: true, error: null });
      },

      /**
       * Mark channel operation loading end.
       */
      finishOperationLoading(): void {
        patchState(store, { isLoading: false });
      },

      /**
       * Select channel
       * @param channel - Channel to select
       */
      selectChannel(channel: Channel | null): void {
        patchState(store, { selectedChannel: channel });
      },

      /**
       * Cleanup all listeners
       */
      cleanup(): void {
        listener.clearAllListeners();
        patchState(store, initialState);
      },
    };
  }),
);
