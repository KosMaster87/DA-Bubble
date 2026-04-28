/**
 * @fileoverview Channel Message State Helper
 * @description Pure helper functions for channel message state updates
 * @module stores/helpers/channel-message-state
 */

import { Message } from '@core/models/message.model';

export interface ChannelOlderMessagesState {
  channelMessages?: { [channelId: string]: Message[] };
  hasMoreMessages?: { [channelId: string]: boolean };
  loadingOlderMessages?: { [channelId: string]: boolean };
}

export interface ChannelMessagesLoadedState {
  channelMessages: { [channelId: string]: Message[] };
  isLoading: boolean;
  updateCounter: number;
  hasMoreMessages: { [channelId: string]: boolean };
}

export class ChannelMessageStateHelper {
  /**
   * Update messages for specific channel
   * @param currentState - Current channel messages state
   * @param channelId - Channel ID to update
   * @param messages - New messages array
   * @returns Updated state object
   * @description Immutably replaces the message array for a single channel without touching other channels' entries.
   */
  static updateChannelMessages(
    currentState: { [channelId: string]: Message[] },
    channelId: string,
    messages: Message[],
  ): { [channelId: string]: Message[] } {
    return {
      ...currentState,
      [channelId]: messages,
    };
  }

  /**
   * Add message to channel
   * @param currentState - Current channel messages state
   * @param channelId - Channel ID
   * @param message - Message to add
   * @returns Updated state object
   * @description Prepends the new message so that the latest message always appears at index 0 for reverse-sorted lists.
   */
  static addMessageToChannel(
    currentState: { [channelId: string]: Message[] },
    channelId: string,
    message: Message,
  ): { [channelId: string]: Message[] } {
    const channelMessages = currentState[channelId] || [];
    return this.updateChannelMessages(currentState, channelId, [message, ...channelMessages]);
  }

  /**
   * Update specific message across all channels
   * @param currentState - Current channel messages state
   * @param messageId - Message ID to update
   * @param updates - Partial updates to apply
   * @returns Updated state object
   * @description Scans all channel buckets when the caller doesn't know which channel owns the message, e.g. after a reaction update from a push notification.
   */
  static updateMessageInAllChannels(
    currentState: { [channelId: string]: Message[] },
    messageId: string,
    updates: Partial<Message>,
  ): { [channelId: string]: Message[] } {
    const updatedState = { ...currentState };
    Object.keys(updatedState).forEach((channelId) => {
      updatedState[channelId] = updatedState[channelId].map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg,
      );
    });
    return updatedState;
  }

  /**
   * Update older-message loading flag for one channel.
   * @description Isolates the per-channel loading flag update so other channels' loading states are not inadvertently reset.
   */
  static updateLoadingOlderMessages(
    currentState: { [channelId: string]: boolean },
    channelId: string,
    isLoading: boolean,
  ): { [channelId: string]: boolean } {
    return {
      ...currentState,
      [channelId]: isLoading,
    };
  }

  /**
   * Update has-more-messages flag for one channel.
   * @description Isolates the per-channel hasMore flag so pagination state is tracked independently for each channel.
   */
  static updateHasMoreMessages(
    currentState: { [channelId: string]: boolean },
    channelId: string,
    hasMore: boolean,
  ): { [channelId: string]: boolean } {
    return {
      ...currentState,
      [channelId]: hasMore,
    };
  }

  /**
   * Build state patch when no older messages remain.
   * @description Returns a minimal patch that only sets hasMoreMessages to false, avoiding a redundant message list rebuild.
   */
  static buildNoMoreMessagesState(
    hasMoreMessages: { [channelId: string]: boolean },
    channelId: string,
  ): ChannelOlderMessagesState {
    return {
      hasMoreMessages: this.updateHasMoreMessages(hasMoreMessages, channelId, false),
    };
  }

  /**
   * Build state patch when older message loading finishes with no results.
   * @description Clears both loading and hasMore flags in one patch when an older-messages query returns an empty result set.
   */
  static buildEmptyOlderMessagesState(
    hasMoreMessages: { [channelId: string]: boolean },
    loadingOlderMessages: { [channelId: string]: boolean },
    channelId: string,
  ): ChannelOlderMessagesState {
    return {
      hasMoreMessages: this.updateHasMoreMessages(hasMoreMessages, channelId, false),
      loadingOlderMessages: this.updateLoadingOlderMessages(loadingOlderMessages, channelId, false),
    };
  }

  /**
   * Build state patch for successful older-message loading.
   * @description Prepends older messages to the channel's existing list and updates both pagination flags in a single state patch.
   */
  static buildOlderMessagesSuccessState(
    channelMessages: { [channelId: string]: Message[] },
    hasMoreMessages: { [channelId: string]: boolean },
    loadingOlderMessages: { [channelId: string]: boolean },
    channelId: string,
    olderMessages: Message[],
  ): ChannelOlderMessagesState {
    const currentMessages = channelMessages[channelId] || [];
    return {
      channelMessages: this.updateChannelMessages(channelMessages, channelId, [
        ...olderMessages,
        ...currentMessages,
      ]),
      loadingOlderMessages: this.updateLoadingOlderMessages(loadingOlderMessages, channelId, false),
      hasMoreMessages: this.updateHasMoreMessages(
        hasMoreMessages,
        channelId,
        olderMessages.length >= 100,
      ),
    };
  }

  /**
   * Build state patch for freshly loaded channel messages.
   * @description Replaces the channel's message list after a full reload and increments updateCounter to trigger dependent computed signals.
   */
  static buildMessagesLoadedState(
    channelMessages: { [channelId: string]: Message[] },
    hasMoreMessages: { [channelId: string]: boolean },
    updateCounter: number,
    channelId: string,
    messages: Message[],
  ): ChannelMessagesLoadedState {
    return {
      channelMessages: this.updateChannelMessages(channelMessages, channelId, messages),
      isLoading: false,
      updateCounter: updateCounter + 1,
      hasMoreMessages: this.updateHasMoreMessages(
        hasMoreMessages,
        channelId,
        messages.length >= 100,
      ),
    };
  }
}
