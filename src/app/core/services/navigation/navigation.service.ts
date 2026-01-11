/**
 * @fileoverview Navigation Service - Central Navigation Orchestrator
 * @description
 * This service is the single source of truth for workspace navigation state and routing.
 * It coordinates navigation between channels, direct messages, threads, and special views.
 *
 * Delegates to specialized navigation services:
 * - NavigationStateService: State management
 * - RouteParserService: URL parsing
 * - ChannelNavigationService: Channel navigation
 * - DirectMessageNavigationService: DM navigation
 * - ThreadNavigationService: Thread navigation
 *
 * @module core/services/navigation
 */

import { inject, Injectable, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStateService, type NavigationState } from './navigation-state.service';
import { RouteParserService, type RouteParams } from './route-parser.service';
import { ChannelNavigationService } from './channel-navigation.service';
import { DirectMessageNavigationService } from './direct-message-navigation.service';
import { ThreadNavigationService } from './thread-navigation.service';
import { type Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

export type { RouteParams, NavigationState };

/**
 * Service for managing workspace navigation
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);
  private stateService = inject(NavigationStateService);
  private routeParser = inject(RouteParserService);
  private channelNav = inject(ChannelNavigationService);
  private dmNav = inject(DirectMessageNavigationService);
  private threadNav = inject(ThreadNavigationService);

  // === STATE GETTERS ===

  /**
   * Get current navigation state
   */
  getState(): NavigationState {
    return this.stateService.getState();
  }

  /**
   * Get selected channel ID signal (read-only)
   */
  getSelectedChannelId() {
    return this.stateService.getSelectedChannelId();
  }

  /**
   * Get selected DM ID signal (read-only)
   */
  getSelectedDirectMessageId() {
    return this.stateService.getSelectedDirectMessageId();
  }

  // === CHANNEL NAVIGATION ===

  /**
   * Select channel and handle navigation
   */
  selectChannel(channelId: string): void {
    this.channelNav.selectChannel(channelId);
  }

  /**
   * Select channel by ID (programmatic, no routing)
   */
  selectChannelById(channelId: string): void {
    this.channelNav.selectChannelById(channelId);
  }

  /**
   * Navigate to channel (explicit routing)
   */
  navigateToChannel(channelId: string): void {
    this.channelNav.navigateToChannel(channelId);
  }

  /**
   * Auto-select DABubble-welcome channel if nothing selected
   */
  autoSelectWelcomeChannel(): void {
    this.channelNav.autoSelectWelcomeChannel();
  }

  // === DIRECT MESSAGE NAVIGATION ===

  /**
   * Select direct message
   */
  selectDirectMessage(conversationId: string): void {
    this.dmNav.selectDirectMessage(conversationId);
  }

  /**
   * Select direct message by ID (programmatic, no routing)
   */
  selectDirectMessageById(conversationId: string): void {
    this.dmNav.selectDirectMessageById(conversationId);
  }

  /**
   * Deselect current direct message
   */
  deselectDirectMessage(): void {
    this.dmNav.deselectDirectMessage();
  }

  /**
   * Navigate to direct message (explicit routing)
   */
  navigateToDirectMessage(conversationId: string): void {
    this.dmNav.navigateToDirectMessage(conversationId);
  }

  // === THREAD NAVIGATION ===

  /**
   * Navigate to conversation and prepare for thread opening
   */
  async navigateToThread(
    conversationId: string,
    isDirectMessage: boolean,
    threadId?: string
  ): Promise<void> {
    return this.threadNav.navigateToThread(conversationId, isDirectMessage, threadId);
  }

  /**
   * Handle thread click from popup hover
   */
  handleThreadClick(
    event: { conversationId: string; messageId: string; message: any },
    isDirectMessage: boolean
  ): { conversationId: string; viewMessage: ViewMessage } {
    return this.threadNav.handleThreadClick(event, isDirectMessage);
  }

  // === SPECIAL VIEWS ===

  /**
   * Navigate to legal page
   */
  navigateToLegal(): void {
    this.stateService.setSelectedChannelId('legal');
    this.router.navigate(['/dashboard/legal']);
  }

  /**
   * Select new message view
   */
  selectNewMessage(): void {
    this.stateService.setNewMessageActive(true);
    this.stateService.setSelectedChannelId(null);
    this.stateService.setSelectedDirectMessageId(null);
    this.stateService.setMailboxActive(false);
  }

  /**
   * Select mailbox
   */
  selectMailbox(): void {
    this.stateService.setMailboxActive(true);
    this.stateService.clearAll();
  }

  /**
   * Navigate to mailbox
   */
  navigateToMailbox(): void {
    this.selectMailbox();
    this.router.navigate(['/dashboard', 'mailbox']);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.stateService.clearAll();
  }

  // === ROUTE PARSING ===

  /**
   * Get current route parameters as signal
   */
  getRouteParams(): Signal<RouteParams> {
    return this.routeParser.getRouteParams();
  }
}
