/**
 * @fileoverview Message Helper Service
 * @description Helper functions for message operations
 * @module shared/services
 */

import { Injectable } from '@angular/core';
import { MessageGroup } from '../dashboard-components/conversation-messages/conversation-messages.component';

/**
 * Service providing helper functions for message operations
 */
@Injectable()
export class MessageHelperService {
  /**
   * Get current total message count from all groups
   */
  getCurrentMessageCount(messageGroups: MessageGroup[]): number {
    return messageGroups.reduce((sum, group) => sum + group.messages.length, 0);
  }

  /**
   * Get the ID of the latest message
   */
  getLatestMessageId(messageGroups: MessageGroup[]): string | null {
    if (messageGroups.length === 0) return null;

    const lastGroup = messageGroups[messageGroups.length - 1];
    if (lastGroup.messages.length === 0) return null;

    const lastMessage = lastGroup.messages[lastGroup.messages.length - 1];
    return lastMessage.id;
  }
}
