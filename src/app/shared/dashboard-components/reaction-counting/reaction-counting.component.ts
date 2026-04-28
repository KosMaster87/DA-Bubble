/**
 * @fileoverview Reaction Counting Component
 * @description Displays reactions (emojis) with their counts for a message
 * @module ReactionCountingComponent
 */

import { Component, input, output, inject } from '@angular/core';
import { MessageReaction } from '@core/models/message.model';
import { ReactionEmojiService } from '@core/services/reaction-emoji/reaction-emoji.service';

@Component({
  selector: 'app-reaction-counting',
  imports: [],
  templateUrl: './reaction-counting.component.html',
  styleUrl: './reaction-counting.component.scss',
})
export class ReactionCountingComponent {
  private emojiService = inject(ReactionEmojiService);

  /**
   * Array of reactions for the current message
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  reactions = input<MessageReaction[]>([]);

  /**
   * Emits when a reaction is clicked
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  reactionClicked = output<string>();

  /**
   * Get emoji icon path by ID
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @param emojiId - The emoji ID
   */
  getEmojiIcon(emojiId: string): string {
    const emoji = this.emojiService.getEmojiById(emojiId);
    return emoji?.icon || '';
  }

  /**
   * Handle reaction button click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @param emoji - The emoji that was clicked
   */
  onReactionClick(emoji: string): void {
    this.reactionClicked.emit(emoji);
  }
}
