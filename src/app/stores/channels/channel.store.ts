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
 * @description Defines the minimal reactive surface needed by the channel store;
 * derived views (myChannels, publicChannels) are computed signals rather than stored state.
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
 * @description Provides a deterministic zero-state used for both store initialization
 * and cleanup resets so the store always starts from a known baseline.
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
 * @description Acts as the single source of truth for channel state, delegating
 * Firestore I/O to the listener and operations services to keep the store thin.
 * @constant {SignalStore}
 */
export const ChannelStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Computed property for total channel count
     * @description Exposes channel count as a reactive signal so templates can bind
     * to it without imperative array-length calculations.
     * @returns {Signal<number>} Number of channels
     */
    channelCount: computed(() => store.channels().length),

    /**
     * Computed property for user channel count
     * @description Provides a quick badge count for the sidebar without exposing the
     * full channel array to components that only need the number.
     * @returns {Signal<number>} Number of user's channels
     */
    userChannelCount: computed(() => store.myChannels().length),

    /**
     * Computed function to get channel by ID
     * @description Returns a stable function reference so callers can look up channels
     * by ID inside templates without breaking signal dependency tracking.
     * @returns {Signal<Function>} Function that takes id and returns channel or undefined
     */
    getChannelById: computed(
      () => (id: string) => store.channels().find((channel) => channel.id === id),
    ),

    /**
     * Computed function to get public channels
     * @description Derived from the full channel list so public/private views stay
     * automatically in sync without a separate Firestore query per view.
     * @returns {Signal<Function>} Function that returns array of public channels
     */
    getPublicChannels: computed(() => store.channels().filter((channel) => !channel.isPrivate)),

    /**
     * Computed function to get private channels
     * @description Mirrors the public-channel computed pattern so both visibility
     * filters stay consistent and are derived from the same canonical channel array.
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
       * @description Thin entry point that delegates to `performLoad` so the public
       * API remains stable while the implementation can change independently.
       * @param userId - Optional user ID to filter
       */
      async loadChannels(userId?: string): Promise<void> {
        this.performLoad(userId);
      },

      /**
       * Entry point: Create new channel
       * @description Public facade that keeps the creation contract stable regardless
       * of internal implementation changes in `performCreate`.
       * @param channelData - Channel data
       * @param createdBy - Creator user ID
       * @returns Channel ID
       */
      async createChannel(channelData: CreateChannelRequest, createdBy: string): Promise<string> {
        return await this.performCreate(channelData, createdBy);
      },

      /**
       * Entry point: Update channel
       * @description Separates the public method signature from the implementation so
       * callers are insulated from future refactoring of the update logic.
       * @param channelId - Channel ID
       * @param updates - Updates to apply
       */
      async updateChannel(channelId: string, updates: Partial<Channel>): Promise<void> {
        await this.performUpdate(channelId, updates);
      },

      /**
       * Entry point: Leave channel
       * @description Acts as a named intent boundary so leave and delete remain
       * clearly distinct operations with their own validation paths.
       * @param channelId - Channel ID
       * @param userId - User ID
       */
      async leaveChannel(channelId: string, userId: string): Promise<void> {
        await this.performLeaveChannel(channelId, userId);
      },

      /**
       * Entry point: Delete channel
       * @description Public surface that separates intent (delete) from the validation
       * and Firestore write logic carried out by `performDeleteChannel`.
       * @param channelId - Channel ID
       */
      async deleteChannel(channelId: string): Promise<void> {
        await this.performDeleteChannel(channelId);
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Load channels
       * @description Wires the real-time listener to state-update callbacks, keeping
       * listener management out of the public entry-point method.
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
       * @description Contains the actual Firestore write so `createChannel` remains a
       * thin entry point while all error-handling and loading logic lives here.
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
       * @description Applies an optimistic local state update alongside the Firestore
       * write so the UI reflects changes immediately without waiting for a snapshot.
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
       * @description Validates owner-leave prohibition before delegating to Firestore
       * so the rule is enforced in one place regardless of call site.
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
       * @description Validates existence before issuing the Firestore delete so
       * callers receive a meaningful error rather than a silent no-op.
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
       * @description Splits the snapshot into the full channel list and the user-filtered
       * subset so both views update atomically from the same snapshot.
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
       * @description Provides a named validation step so callers read as business rules
       * rather than raw guard checks scattered through the store.
       * @param channelId - Channel ID
       */
      validateChannelExists(channelId: string): void {
        this.getChannelOrThrow(channelId);
      },

      /**
       * Validate user can leave channel
       * @description Centralizes the business rule that channel owners cannot leave,
       * keeping validation logic away from UI components.
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
       * @description Surfaces a consistent error shape for missing channels so every
       * call site gets the same failure semantics without duplicating guard logic.
       */
      getChannelOrThrow(channelId: string): Channel {
        const channel = store.getChannelById()(channelId);
        if (!channel) throw new Error('Channel not found');
        return channel;
      },

      /**
       * Update channel in state
       * @description Applies an immutable state patch so signal consumers re-evaluate
       * only when channel data genuinely changes.
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
       * @description Normalizes any error to a string and clears the loading flag so
       * the UI is never left in a permanent loading state after a failure.
       * @param error - Error object
       * @param defaultMessage - Default message
       */
      handleError(error: unknown, defaultMessage: string): void {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      /**
       * Execute channel operation with shared loading and error handling.
       * @description Centralizes loading-state lifecycle and error normalization so
       * individual operations only express their specific Firestore call.
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
       * @description Calls optional success side-effects and resets loading state in
       * one place so individual operations don't repeat the same post-success pattern.
       */
      completeChannelOperation(withLoadingState: boolean, onSuccess?: () => void): void {
        onSuccess?.();
        if (withLoadingState) {
          this.finishOperationLoading();
        }
      },

      /**
       * Mark channel operation loading start.
       * @description Sets loading and clears error as an atomic patch so the UI
       * transitions cleanly from idle to loading without an intermediate error state.
       */
      startOperationLoading(): void {
        patchState(store, { isLoading: true, error: null });
      },

      /**
       * Mark channel operation loading end.
       * @description Paired counterpart to `startOperationLoading` to keep loading
       * lifecycle symmetric and prevent the store from getting stuck in loading state.
       */
      finishOperationLoading(): void {
        patchState(store, { isLoading: false });
      },

      /**
       * Select channel
       * @description Provides a dedicated mutation for selection state so components
       * don't need to call `patchState` directly and bypass the store API.
       * @param channel - Channel to select
       */
      selectChannel(channel: Channel | null): void {
        patchState(store, { selectedChannel: channel });
      },

      /**
       * Cleanup all listeners
       * @description Resets the store to its initial state and clears Firestore
       * listeners so no orphaned subscriptions remain after the store is destroyed.
       */
      cleanup(): void {
        listener.clearAllListeners();
        patchState(store, initialState);
      },
    };
  }),
);
