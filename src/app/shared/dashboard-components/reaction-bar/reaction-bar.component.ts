/**
 * @fileoverview Reaction Bar Component
 * @description Quick reaction bar with emoji and comment options
 * @module shared/dashboard-components/reaction-bar
 */

import { Component, input, output, signal } from '@angular/core';

export type ReactionType = 'thumbs-up' | 'checked' | 'add-reaction' | 'comment';

@Component({
  selector: 'app-reaction-bar',
  imports: [],
  templateUrl: './reaction-bar.component.html',
  styleUrl: './reaction-bar.component.scss',
})
export class ReactionBarComponent {
  messageType = input<'own' | 'other'>('other');
  isInThread = input<boolean>(false);
  reactionClicked = output<ReactionType>();
  editMessageClicked = output<void>();

  protected isEditMenuOpen = signal<boolean>(false);

  /**
   * Handle reaction click
   */
  onReactionClick(type: ReactionType): void {
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
}
