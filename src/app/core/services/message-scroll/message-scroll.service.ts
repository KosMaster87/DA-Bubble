/**
 * @fileoverview Message Scroll Service
 * @description Handles scrolling to messages with highlight effects
 * @module core/services/message-scroll
 */

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MessageScrollService {
  /**
   * Scroll to a specific message
   * @param {string} messageId - Message ID in format 'channelId_messageId' or just 'messageId'
   * @returns {void}
   * @description Scrolls to message and applies highlight effect for 2 seconds
   */
  scrollToMessage = (messageId: string): void => {
    const actualMessageId = this.extractMessageId(messageId);

    setTimeout(() => {
      const messageElement = this.findMessageElement(actualMessageId);
      if (messageElement) {
        this.scrollToElement(messageElement);
        this.applyHighlight(messageElement);
      }
    }, 100);
  };

  /**
   * Extract message ID from composite ID
   * @private
   * @param {string} messageId - Message ID (possibly with channel prefix)
   * @returns {string} Extracted message ID
   */
  private extractMessageId = (messageId: string): string => {
    return messageId.includes('_') ? messageId.split('_')[1] : messageId;
  };

  /**
   * Find message element in DOM
   * @private
   * @param {string} messageId - Message identifier
   * @returns {Element | null} Message element or null
   */
  private findMessageElement = (messageId: string): Element | null => {
    return document.querySelector(`[data-message-id="${messageId}"]`);
  };

  /**
   * Scroll to element
   * @private
   * @param {Element} element - DOM element
   * @returns {void}
   */
  private scrollToElement = (element: Element): void => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /**
   * Apply highlight effect
   * @private
   * @param {Element} element - DOM element
   * @returns {void}
   * @description Adds highlight class for 2 seconds
   */
  private applyHighlight = (element: Element): void => {
    element.classList.add('highlight');
    setTimeout(() => element.classList.remove('highlight'), 2000);
  };
}
