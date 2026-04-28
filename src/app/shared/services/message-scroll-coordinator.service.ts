/**
 * @fileoverview Message Scroll Coordinator Service
 * @description Coordinates message-list scroll heuristics so initial loads, new messages, and user-driven scrolling stay behaviorally consistent.
 * @module shared/services
 */

import { ElementRef, Injectable, inject } from '@angular/core';
import { ChatScrollService } from './chat-scroll.service';

export interface ScrollState {
  shouldScrollToBottom: boolean;
  lastMessageCount: number;
  lastScrollTop: number;
  scrollTimeout?: any;
}

/**
 * Service for coordinating message scroll behavior
 * @description Centralizes scroll state transitions so components can delegate scroll policy without reimplementing viewport math.
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
   * @description Decides whether auto-scroll should trigger on first hydration or incremental message arrival.
   */
  handleMessageCountChange(
    conversationId: string,
    currentCount: number,
    autoScrollEnabled: boolean,
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
   * @description Detects the first non-empty message snapshot to allow an initial jump to the latest message.
   */
  private isInitialLoad(currentCount: number): boolean {
    return this.state.lastMessageCount === 0 && currentCount > 0;
  }

  /**
   * Check if should auto-scroll for new messages
   * @description Triggers auto-scroll only when the message count increases and the conversation permits automatic following.
   */
  private shouldAutoScrollForNewMessages(
    currentCount: number,
    autoScrollEnabled: boolean,
  ): boolean {
    return currentCount > this.state.lastMessageCount && autoScrollEnabled;
  }

  /**
   * Scroll to bottom of messages
   * @description Schedules a post-render scroll so DOM height changes are applied before calculating the bottom position.
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
   * @description Wraps low-level scroll execution with error handling to avoid breaking message flow on transient DOM issues.
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
   * @description Computes the scroll offset required to align the viewport with the newest message at the bottom.
   */
  private calculateTargetScrollTop(container: HTMLElement): number {
    return container.scrollHeight - container.clientHeight;
  }

  /**
   * Scroll container to target position
   * @description Applies the calculated target and records it so subsequent user-scroll detection has a stable baseline.
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
   * @description Tracks user scroll movement and updates conversation auto-scroll eligibility when position meaningfully changes.
   */
  processScroll(container: ElementRef<any> | undefined, conversationId: string): void {
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
   * @description Ignores tiny scroll jitter so expensive state updates occur only for meaningful movement.
   */
  private hasScrollPositionChanged(scrollTop: number): boolean {
    return Math.abs(scrollTop - this.state.lastScrollTop) > 5;
  }

  /**
   * Handle scroll position change
   * @description Synchronizes auto-scroll preference with actual viewport position to respect user intent when reading older messages.
   */
  private handleScrollPositionChange(
    container: HTMLElement,
    scrollTop: number,
    conversationId: string,
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
   * @description Uses a bottom-threshold tolerance so near-bottom positions still count as actively following new messages.
   */
  private isScrolledToBottom(container: HTMLElement, scrollTop: number): boolean {
    const distanceFromBottom = container.scrollHeight - scrollTop - container.clientHeight;
    return distanceFromBottom < 50;
  }

  /**
   * Check if should scroll to bottom
   * @description Exposes the pending auto-scroll decision for callers that schedule UI updates after message renders.
   */
  shouldScroll(): boolean {
    return this.state.shouldScrollToBottom;
  }

  /**
   * Reset scroll flag
   * @description Clears one-shot auto-scroll intent after the UI applies the requested jump.
   */
  resetScrollFlag(): void {
    this.state.shouldScrollToBottom = false;
  }

  /**
   * Debounce scroll event processing
   * @description Collapses rapid scroll events into a single callback to reduce recalculation and state churn.
   */
  debounceScroll(callback: () => void): void {
    if (this.state.scrollTimeout) {
      clearTimeout(this.state.scrollTimeout);
    }
    this.state.scrollTimeout = setTimeout(callback, 100);
  }

  /**
   * Get last message count
   * @description Returns the last observed message count used to detect initial load versus incremental updates.
   */
  getLastMessageCount(): number {
    return this.state.lastMessageCount;
  }

  /**
   * Update last message count
   * @description Persists the latest count snapshot after processing so future comparisons remain accurate.
   */
  updateLastMessageCount(count: number): void {
    this.state.lastMessageCount = count;
  }
}
