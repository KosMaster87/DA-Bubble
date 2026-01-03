/**
 * @fileoverview Reaction Emoji Model
 * @description Available emojis for message reactions
 * @module ReactionEmojiModel
 */

export interface ReactionEmoji {
  /** Unique identifier for the emoji */
  id: string;
  /** Emoji character or icon path */
  icon: string;
  /** Display name */
  label: string;
  /** Category for grouping */
  category: 'default' | 'extended';
}

/**
 * Default emoji reactions (shown first)
 */
export const DEFAULT_REACTION_EMOJIS: ReactionEmoji[] = [
  {
    id: 'thumbs-up',
    icon: '/img/icon/emojis/emoji-thumbs-up.svg',
    label: 'Thumbs up',
    category: 'default',
  },
  {
    id: 'checked',
    icon: '/img/icon/emojis/emoji-checked.svg',
    label: 'Checked',
    category: 'default',
  },
  {
    id: 'rocket',
    icon: '/img/icon/emojis/emoji-rocket.svg',
    label: 'Rocket',
    category: 'default',
  },
  {
    id: 'nerd-face',
    icon: '/img/icon/emojis/emoji-nerd-face.svg',
    label: 'Nerd face',
    category: 'default',
  },
];

/**
 * All available emojis (default + extended)
 */
export const ALL_REACTION_EMOJIS: ReactionEmoji[] = [
  ...DEFAULT_REACTION_EMOJIS,
  // Extended emojis können später hinzugefügt werden
];
