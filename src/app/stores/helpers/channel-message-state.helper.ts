/**
 * @fileoverview Channel Message State Helper
 * @description Pure helper functions for channel message state updates
 * @module stores/helpers/channel-message-state
 */

import { Message } from '@core/models/message.model';

export class ChannelMessageStateHelper {
  /**
   * Update messages for specific channel
   * @param currentState - Current channel messages state
   * @param channelId - Channel ID to update
   * @param messages - New messages array
   * @returns Updated state object
   */
  static updateChannelMessages(
    currentState: { [channelId: string]: Message[] },
    channelId: string,
    messages: Message[]
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
   */
  static addMessageToChannel(
    currentState: { [channelId: string]: Message[] },
    channelId: string,
    message: Message
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
   */
  static updateMessageInAllChannels(
    currentState: { [channelId: string]: Message[] },
    messageId: string,
    updates: Partial<Message>
  ): { [channelId: string]: Message[] } {
    const updatedState = { ...currentState };
    Object.keys(updatedState).forEach((channelId) => {
      updatedState[channelId] = updatedState[channelId].map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
    });
    return updatedState;
  }
}
