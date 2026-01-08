/**
 * @fileoverview Message Grouping Service
 * @description Groups messages by date with formatted labels
 * @module core/services/message-grouping
 */

import { Injectable } from '@angular/core';
import type { Message, MessageGroup } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

@Injectable({
  providedIn: 'root',
})
export class MessageGroupingService {
  /**
   * Group messages by date
   * @param messages - Messages to group
   * @returns Messages grouped by date with labels
   */
  groupMessagesByDate(messages: Message[]): MessageGroup[] {
    const groups = new Map<string, Message[]>();

    messages.forEach((msg) => {
      const dateKey = this.getDateKey(msg.timestamp);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(msg);
    });

    return Array.from(groups.entries()).map(([_, msgs]) => ({
      date: msgs[0].timestamp,
      label: this.getDateLabel(msgs[0].timestamp),
      messages: msgs,
    }));
  }

  /**
   * Get date key for grouping (YYYY-MM-DD)
   * @param date - Date to convert
   * @returns Date key string
   */
  private getDateKey(date: Date): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };

  /**
   * Get date label ("Starting today" or formatted date)
   * @param date - Date to format
   * @returns Formatted date label
   */
  private getDateLabel(date: Date): string {
    const today = new Date();
    const messageDate = new Date(date);

    if (isNaN(messageDate.getTime())) {
      return 'Starting today';
    }

    if (this.isSameDay(today, messageDate)) {
      return 'Starting today';
    }

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(messageDate);
  };

  /**
   * Check if two dates are the same day
   * @param date1 - First date
   * @param date2 - Second date
   * @returns True if same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}
