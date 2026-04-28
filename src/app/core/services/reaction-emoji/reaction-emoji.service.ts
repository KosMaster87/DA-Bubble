/**
 * @fileoverview Reaction Emoji Service
 * @description Provides available reaction emojis and manages reaction logic
 * @module ReactionEmojiService
 */

import { Injectable } from '@angular/core';
import {
  ALL_REACTION_EMOJIS,
  DEFAULT_REACTION_EMOJIS,
  ReactionEmoji,
} from '@core/models/reaction-emoji.model';

@Injectable({
  providedIn: 'root',
})
export class ReactionEmojiService {
  /**
   * Get default reaction emojis (shown in quick reaction bar)
   * @description Returns the curated subset of emojis displayed in the quick-reaction toolbar without needing the full emoji picker.
   */
  getDefaultEmojis(): ReactionEmoji[] {
    return DEFAULT_REACTION_EMOJIS;
  }

  /**
   * Get all available reaction emojis (shown in emoji picker)
   * @description Returns the complete emoji catalogue for the full emoji picker overlay.
   */
  getAllEmojis(): ReactionEmoji[] {
    return ALL_REACTION_EMOJIS;
  }

  /**
   * Find emoji by ID
   * @description Looks up a single emoji by its string ID, used to resolve stored emoji IDs back to display-ready emoji objects.
   */
  getEmojiById(id: string): ReactionEmoji | undefined {
    return ALL_REACTION_EMOJIS.find((emoji) => emoji.id === id);
  }

  /**
   * Get emoji icon path
   * @description Convenience wrapper that resolves an emoji ID directly to its icon asset path.
   */
  getEmojiIcon(id: string): string | undefined {
    return this.getEmojiById(id)?.icon;
  }
}
