/**
 * @fileoverview Reaction Bar Component
 * @description Quick reaction bar with emoji and comment options
 * @module shared/dashboard-components/reaction-bar
 */

import { Component, input, output, signal, inject } from '@angular/core';
import { ReactionEmojiService } from '@core/services/reaction-emoji/reaction-emoji.service';
import { ReactionEmoji } from '@core/models/reaction-emoji.model';

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
  reactionClicked = output<ReactionType>();
  editMessageClicked = output<void>();

  protected isEditMenuOpen = signal<boolean>(false);
  protected isEmojiPickerOpen = signal<boolean>(false);
  protected availableEmojis = this.reactionEmojiService.getAllEmojis();

  /**
   * Handle reaction click
   */
  onReactionClick(type: ReactionType): void {
    console.log('🟢 ReactionBar: Emoji clicked:', type);
    this.reactionClicked.emit(type);
  }

  /**
   * Toggle edit menu
   */
  toggleEditMenu(): void {
    this.isEditMenuOpen.set(!this.isEditMenuOpen());
  }

  /**
   * Close edit menu
   */
  closeEditMenu(): void {
    this.isEditMenuOpen.set(false);
  }

  /**
   * Handle edit message click
   */
  onEditMessage(): void {
    this.editMessageClicked.emit();
    this.closeEditMenu();
  }

  /**
   * Toggle emoji picker
   */
  toggleEmojiPicker(): void {
    console.log('🟡 ReactionBar: Toggling emoji picker');
    this.isEmojiPickerOpen.set(!this.isEmojiPickerOpen());
  }

  /**
   * Close emoji picker
   */
  closeEmojiPicker(): void {
    this.isEmojiPickerOpen.set(false);
  }

  /**
   * Handle emoji selection from picker
   */
  onEmojiSelect(emoji: ReactionEmoji): void {
    console.log('🟢 ReactionBar: Emoji selected from picker:', emoji.id);
    this.reactionClicked.emit(emoji.id);
    this.closeEmojiPicker();
  }
}
