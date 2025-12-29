/**
 * @fileoverview Reaction Bar Component
 * @description Quick reaction bar with emoji and comment options
 * @module shared/dashboard-components/reaction-bar
 */

import { Component, input, output } from '@angular/core';

export type ReactionType = 'thumbs-up' | 'checked' | 'add-reaction' | 'comment';

@Component({
  selector: 'app-reaction-bar',
  imports: [],
  templateUrl: './reaction-bar.component.html',
  styleUrl: './reaction-bar.component.scss',
})
export class ReactionBarComponent {
  messageType = input<'own' | 'other'>('other');
  reactionClicked = output<ReactionType>();

  /**
   * Handle reaction click
   */
  onReactionClick(type: ReactionType): void {
    this.reactionClicked.emit(type);
  }
}
