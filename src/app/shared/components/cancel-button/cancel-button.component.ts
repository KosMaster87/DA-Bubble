/**
 * @fileoverview Reusable Cancel Button Component
 * @description Standalone component for cancel action buttons
 * @module shared/components/cancel-button
 */

import { Component, input, output } from '@angular/core';

/**
 * Cancel button component for dismissing actions
 * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
 * @component CancelButtonComponent
 */
@Component({
  selector: 'app-cancel-button',
  imports: [],
  templateUrl: './cancel-button.component.html',
  styleUrl: './cancel-button.component.scss',
})
export class CancelButtonComponent {
  label = input<string>('Cancel');
  type = input<'submit' | 'button'>('button');
  disabled = input<boolean>(false);
  clicked = output<void>();

  /**
   * Handle button click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @function handleClick
   * @returns {void}
   */
  handleClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
