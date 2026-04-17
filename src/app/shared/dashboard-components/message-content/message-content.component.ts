/**
 * @fileoverview Message Content Component
 * @description Renders message text with clickable @mentions and #channels
 * @module shared/dashboard-components/message-content
 */

import { Component, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MentionChipComponent } from '../mention-chip/mention-chip.component';
import { UserStore } from '@stores/users/user.store';
import { ChannelStore } from '@stores/channels/channel.store';
import { MessageParsingService, MessageSegment } from '../../services/message-parsing.service';

export type { MessageSegment } from '../../services/message-parsing.service';

@Component({
  selector: 'app-message-content',
  standalone: true,
  imports: [CommonModule, MentionChipComponent],
  providers: [MessageParsingService],
  templateUrl: './message-content.component.html',
  styleUrl: './message-content.component.scss',
})
export class MessageContentComponent {
  private userStore = inject(UserStore);
  private channelStore = inject(ChannelStore);
  private parsingService = inject(MessageParsingService);

  content = input.required<string>();
  mentionClicked = output<string>();
  channelClicked = output<string>();

  /**
   * Parse message content into segments using parsing service
   * @returns {MessageSegment[]} Array of parsed segments
   */
  protected segments = computed<MessageSegment[]>(() => {
    return this.parsingService.parse(
      this.content(),
      this.userStore.users(),
      this.channelStore.channels()
    );
  });

  /**
   * Handle mention click
   * Emits user ID when mention is clicked
   * @param {string} userId - ID of mentioned user
   * @returns {void}
   */
  protected onMentionClick = (userId: string): void => {
    this.mentionClicked.emit(userId);
  };

  /**
   * Handle channel click
   * Emits channel ID when channel mention is clicked
   * @param {string} channelId - ID of mentioned channel
   * @returns {void}
   */
  protected onChannelClick = (channelId: string): void => {
    this.channelClicked.emit(channelId);
  };
}
