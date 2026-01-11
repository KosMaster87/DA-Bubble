/**
 * @fileoverview Message Scroll Coordinator Service
 * @description Coordinates scroll behavior for message containers
 * @module shared/services
 */

import { Injectable, inject, ElementRef } from '@angular/core';
import { ChatScrollService } from './chat-scroll.service';

export interface ScrollState {
  shouldScrollToBottom: boolean;
  lastMessageCount: number;
  lastScrollTop: number;
  scrollTimeout?: any;
}

/**
 * Service for coordinating message scroll behavior
 */
@Injectable()
export class MessageScrollCoordinatorService {
  private chatScrollService = inject(ChatScrollService);

  private state: ScrollState = {
    shouldScrollToBottom: false,
    lastMessageCount: 0,
    lastScrollTop: 0,
  };

  /**
   * Handle message count change (initial load or new messages)
   */
  handleMessageCountChange(
    conversationId: string,
    currentCount: number,
    autoScrollEnabled: boolean
  ): { shouldScroll: boolean; latestMessageId: string | null } {
    let shouldScroll = false;
    let latestMessageId: string | null = null;

    if (this.isInitialLoad(currentCount)) {
      shouldScroll = true;
      this.state.shouldScrollToBottom = true;
    } else if (this.shouldAutoScrollForNewMessages(currentCount, autoScrollEnabled)) {
      shouldScroll = true;
      this.state.shouldScrollToBottom = true;
    }

    this.state.lastMessageCount = currentCount;
    return { shouldScroll, latestMessageId };
  }

  /**
   * Check if this is initial load
   */
  private isInitialLoad(currentCount: number): boolean {
    return this.state.lastMessageCount === 0 && currentCount > 0;
  }

  /**
   * Check if should auto-scroll for new messages
   */
  private shouldAutoScrollForNewMessages(currentCount: number, autoScrollEnabled: boolean): boolean {
    return currentCount > this.state.lastMessageCount && autoScrollEnabled;
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom(container: ElementRef<any> | undefined): void {
    if (!container?.nativeElement) {
      console.warn('⚠️ scrollToBottom: messagesContainer not found');
      return;
    }

    setTimeout(() => this.performScroll(container.nativeElement), 0);
  }

  /**
   * Perform actual scroll operation
   */
  private performScroll(container: HTMLElement): void {
    try {
      const targetScrollTop = this.calculateTargetScrollTop(container);

      if (targetScrollTop > 0) {
        this.scrollToTarget(container, targetScrollTop);
      }
    } catch (err) {
      console.error('❌ Scroll to bottom failed:', err);
    }
  }

  /**
   * Calculate target scroll position
   */
  private calculateTargetScrollTop(container: HTMLElement): number {
    return container.scrollHeight - container.clientHeight;
  }

  /**
   * Scroll container to target position
   */
  private scrollToTarget(container: HTMLElement, targetScrollTop: number): void {
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'instant',
    });
    this.state.lastScrollTop = targetScrollTop;
  }

  /**
   * Process scroll position and update auto-scroll state
   */
  processScroll(
    container: ElementRef<any> | undefined,
    conversationId: string
  ): void {
    if (!container?.nativeElement) return;

    const element = container.nativeElement;
    const scrollTop = element.scrollTop;

    if (this.hasScrollPositionChanged(scrollTop)) {
      this.handleScrollPositionChange(element, scrollTop, conversationId);
      this.state.lastScrollTop = scrollTop;
    }
  }

  /**
   * Check if scroll position changed significantly
   */
  private hasScrollPositionChanged(scrollTop: number): boolean {
    return Math.abs(scrollTop - this.state.lastScrollTop) > 5;
  }

  /**
   * Handle scroll position change
   */
  private handleScrollPositionChange(
    container: HTMLElement,
    scrollTop: number,
    conversationId: string
  ): void {
    const isAtBottom = this.isScrolledToBottom(container, scrollTop);

    if (isAtBottom) {
      this.chatScrollService.setAutoScroll(conversationId, true);
    } else {
      this.chatScrollService.setAutoScroll(conversationId, false);
    }
  }

  /**
   * Check if scrolled to bottom
   */
  private isScrolledToBottom(container: HTMLElement, scrollTop: number): boolean {
    const distanceFromBottom = container.scrollHeight - scrollTop - container.clientHeight;
    return distanceFromBottom < 50;
  }

  /**
   * Check if should scroll to bottom
   */
  shouldScroll(): boolean {
    return this.state.shouldScrollToBottom;
  }

  /**
   * Reset scroll flag
   */
  resetScrollFlag(): void {
    this.state.shouldScrollToBottom = false;
  }

  /**
   * Debounce scroll event processing
   */
  debounceScroll(callback: () => void): void {
    if (this.state.scrollTimeout) {
      clearTimeout(this.state.scrollTimeout);
    }
    this.state.scrollTimeout = setTimeout(callback, 100);
  }

  /**
   * Get last message count
   */
  getLastMessageCount(): number {
    return this.state.lastMessageCount;
  }

  /**
   * Update last message count
   */
  updateLastMessageCount(count: number): void {
    this.state.lastMessageCount = count;
  }
}
