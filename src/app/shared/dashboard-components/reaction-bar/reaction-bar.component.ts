/**
 * @fileoverview Reaction Bar Component
 * @description Quick reaction bar with emoji and comment options
 * @module shared/dashboard-components/reaction-bar
 */

import { Component, inject, input, output, signal } from '@angular/core';
import { ReactionEmoji } from '@core/models/reaction-emoji.model';
import { ReactionEmojiService } from '@core/services/reaction-emoji/reaction-emoji.service';

export type ReactionType =
  | 'thumbs-up'
  | 'checked'
  | 'rocket'
  | 'nerd-face'
  | 'add-reaction'
  | 'comment'
  | string;

@Component({
  selector: 'app-reaction-bar',
  imports: [],
  templateUrl: './reaction-bar.component.html',
  styleUrl: './reaction-bar.component.scss',
})
export class ReactionBarComponent {
  private reactionEmojiService = inject(ReactionEmojiService);

  messageType = input<'own' | 'other'>('other');
  isInThread = input<boolean>(false);
  hideComment = input<boolean>(false);
  reactionClicked = output<ReactionType>();
  editMessageClicked = output<void>();
  deleteMessageClicked = output<void>();

  protected isEditMenuOpen = signal<boolean>(false);
  protected isEmojiPickerOpen = signal<boolean>(false);
  protected availableEmojis = this.reactionEmojiService.getAllEmojis();

  /**
   * Handle reaction click
   * @description Emits the selected quick-action so parent message components can handle comment/reaction intent.
   */
  onReactionClick(type: ReactionType): void {
    this.reactionClicked.emit(type);
  }

  /**
   * Toggle edit menu
   * @description Toggles contextual edit-menu visibility for own-message actions.
   */
  toggleEditMenu(): void {
    this.isEditMenuOpen.set(!this.isEditMenuOpen());
  }

  /**
   * Close edit menu
   * @description Closes the contextual edit menu after action completion or dismiss.
   */
  closeEditMenu(): void {
    this.isEditMenuOpen.set(false);
  }

  /**
   * Handle edit message click
   * @description Emits edit intent and closes the menu to return focus to inline edit flow.
   */
  onEditMessage(): void {
    this.editMessageClicked.emit();
    this.closeEditMenu();
  }

  /**
   * Handle delete message click
   * @description Emits delete intent and closes the menu before confirmation handling begins.
   */
  onDeleteMessage(): void {
    this.deleteMessageClicked.emit();
    this.closeEditMenu();
  }

  /**
   * Toggle emoji picker
   * @description Toggles emoji picker visibility for custom reaction selection.
   */
  toggleEmojiPicker(): void {
    this.isEmojiPickerOpen.set(!this.isEmojiPickerOpen());
  }

  /**
   * Close emoji picker
   * @description Closes emoji picker explicitly after selection or dismiss interactions.
   */
  closeEmojiPicker(): void {
    this.isEmojiPickerOpen.set(false);
  }

  /**
   * Handle emoji selection from picker
   * @description Emits the selected emoji reaction ID and immediately collapses the picker.
   */
  onEmojiSelect(emoji: ReactionEmoji): void {
    this.reactionClicked.emit(emoji.id);
    this.closeEmojiPicker();
  }
}
