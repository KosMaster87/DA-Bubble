/**
 * @fileoverview Reusable Primary Button Component
 * @description Standalone component for primary action buttons with loading state
 * @module shared/components/primary-button
 */

import { Component, input, output } from '@angular/core';

/**
 * Primary button component with loading spinner
 * @description Defines a single hydration path so startup and reload behavior remain predictable across navigation scenarios.
 * @component PrimaryButtonComponent
 */
@Component({
  selector: 'app-primary-button',
  imports: [],
  templateUrl: './primary-button.component.html',
  styleUrl: './primary-button.component.scss',
})
export class PrimaryButtonComponent {
  label = input<string>('Continue');
  type = input<'submit' | 'button'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  clicked = output<void>();

  /**
   * Handle button click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @function handleClick
   * @returns {void}
   */
  handleClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit();
    }
  }
}
