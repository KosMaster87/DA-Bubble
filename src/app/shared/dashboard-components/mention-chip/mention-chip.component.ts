/**
 * @fileoverview Mention Chip Component
 * @description Small chip component for displaying @user mentions in message input
 * @module shared/dashboard-components/mention-chip
 */

import { Component, input, output } from '@angular/core';

export interface MentionChipData {
  id: string;
  type: 'user' | 'channel';
  name: string;
  avatar?: string;
}

@Component({
  selector: 'app-mention-chip',
  standalone: true,
  imports: [],
  templateUrl: './mention-chip.component.html',
  styleUrl: './mention-chip.component.scss',
})
export class MentionChipComponent {
  data = input.required<MentionChipData>();
  removed = output<void>();

  /**
   * Handle remove button click
   * Stops event propagation and emits removal event
   * @param {Event} event - DOM click event
   * @returns {void}
   */
  protected onRemove = (event: Event): void => {
    event.stopPropagation();
    this.removed.emit();
  };
}
