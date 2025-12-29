/**
 * @fileoverview Conversation Messages Component
 * @description Reusable component for displaying grouped messages with date separators
 * @module shared/dashboard-components/conversation-messages
 */

import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactionBarComponent, type ReactionType } from '../reaction-bar/reaction-bar.component';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
  reactions?: { emoji: string; count: number }[];
  threadCount?: number;
  lastThreadTimestamp?: Date;
}

export interface MessageGroup {
  date: Date;
  label: string;
  messages: Message[];
}

@Component({
  selector: 'app-conversation-messages',
  imports: [DatePipe, ReactionBarComponent],
  templateUrl: './conversation-messages.component.html',
  styleUrl: './conversation-messages.component.scss',
})
export class ConversationMessagesComponent {
  messageGroups = input.required<MessageGroup[]>();
  messageClicked = output<string>();
  avatarClicked = output<string>();
  reactionAdded = output<{ messageId: string; emoji: string }>();
  reactionBarClicked = output<{ messageId: string; type: ReactionType }>();
  threadClicked = output<string>();

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    this.messageClicked.emit(messageId);
  }

  /**
   * Handle avatar click
   */
  onAvatarClick(senderId: string): void {
    this.avatarClicked.emit(senderId);
  }

  /**
   * Handle reaction click
   */
  onReactionClick(messageId: string, emoji: string): void {
    this.reactionAdded.emit({ messageId, emoji });
  }

  /**
   * Handle reaction bar button click
   */
  onReactionBarClick(messageId: string, type: ReactionType): void {
    if (type === 'comment') {
      this.threadClicked.emit(messageId);
    } else {
      this.reactionBarClicked.emit({ messageId, type });
    }
  }

  /**
   * Handle thread button click
   */
  onThreadClick(messageId: string): void {
    this.threadClicked.emit(messageId);
  }
}
