/**
 * @fileoverview Message Helper Service
 * @description Provides lightweight aggregate helpers for grouped message collections used by conversation views.
 * @module shared/services
 */

import { Injectable } from '@angular/core';
import { MessageGroup } from '../dashboard-components/conversation-messages/conversation-messages.component';

/**
 * Service providing helper functions for message operations
 * @description Centralizes common message-group calculations so components avoid duplicating count and latest-ID logic.
 */
@Injectable()
export class MessageHelperService {
  /**
   * Get current total message count from all groups
   * @description Sums nested group lengths to compute a single total count for change detection and scroll logic.
   */
  getCurrentMessageCount(messageGroups: MessageGroup[]): number {
    return messageGroups.reduce((sum, group) => sum + group.messages.length, 0);
  }

  /**
   * Get the ID of the latest message
   * @description Returns the ID of the last message in the last group, with null-safe guards for empty inputs.
   */
  getLatestMessageId(messageGroups: MessageGroup[]): string | null {
    if (messageGroups.length === 0) return null;

    const lastGroup = messageGroups[messageGroups.length - 1];
    if (lastGroup.messages.length === 0) return null;

    const lastMessage = lastGroup.messages[lastGroup.messages.length - 1];
    return lastMessage.id;
  }
}
