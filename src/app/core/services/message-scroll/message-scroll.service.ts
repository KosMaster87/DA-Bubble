/**
 * @fileoverview Message Scroll Service
 * @description Centralizes message jump-and-highlight behavior so search and deep-link navigation use one consistent visual flow.
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
    * @description Performs smooth scroll and a temporary highlight so users can immediately orient to the target message.
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
   * @description Strips the channel-prefix segment from composite IDs (format channelId_messageId) so the DOM lookup uses only the message part.
   * @private
   * @param {string} messageId - Message ID (possibly with channel prefix)
   * @returns {string} Extracted message ID
   */
  private extractMessageId = (messageId: string): string => {
    return messageId.includes('_') ? messageId.split('_')[1] : messageId;
  };

  /**
   * Find message element in DOM
   * @description Uses a data-attribute selector instead of an ID so the component can render the attribute without needing to know Angular’s change-detection cycle.
   * @private
   * @param {string} messageId - Message identifier
   * @returns {Element | null} Message element or null
   */
  private findMessageElement = (messageId: string): Element | null => {
    return document.querySelector(`[data-message-id="${messageId}"]`);
  };

  /**
   * Scroll to element
   * @description Scrolls with smooth behavior so the jump to the target message is visually guided rather than instant.
   * @private
   * @param {Element} element - DOM element
   * @returns {void}
   */
  private scrollToElement = (element: Element): void => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /**
   * Apply highlight effect
   * @description Adds a CSS class for 2 seconds to flash the message, giving the user a clear visual anchor after the scroll.
   * @private
   * @param {Element} element - DOM element
   * @returns {void}
   */
  private applyHighlight = (element: Element): void => {
    element.classList.add('highlight');
    setTimeout(() => element.classList.remove('highlight'), 2000);
  };
}
