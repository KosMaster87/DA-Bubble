/**
 * @fileoverview Reaction Emoji Service
 * @description Provides available reaction emojis and manages reaction logic
 * @module ReactionEmojiService
 */

import { Injectable } from '@angular/core';
import {
  ReactionEmoji,
  DEFAULT_REACTION_EMOJIS,
  ALL_REACTION_EMOJIS,
} from '@core/models/reaction-emoji.model';

@Injectable({
  providedIn: 'root',
})
export class ReactionEmojiService {
  /**
   * Get default reaction emojis (shown in quick reaction bar)
   */
  getDefaultEmojis(): ReactionEmoji[] {
    return DEFAULT_REACTION_EMOJIS;
  }

  /**
   * Get all available reaction emojis (shown in emoji picker)
   */
  getAllEmojis(): ReactionEmoji[] {
    return ALL_REACTION_EMOJIS;
  }

  /**
   * Find emoji by ID
   */
  getEmojiById(id: string): ReactionEmoji | undefined {
    return ALL_REACTION_EMOJIS.find((emoji) => emoji.id === id);
  }

  /**
   * Get emoji icon path
   */
  getEmojiIcon(id: string): string | undefined {
    return this.getEmojiById(id)?.icon;
  }
}
