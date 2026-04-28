/**
 * @fileoverview Reusable Secondary Button Component
 * @description Standalone component for secondary action buttons with transparent background and border
 * @module shared/components/secondary-button
 */

import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-secondary-button',
  imports: [],
  templateUrl: './secondary-button.component.html',
  styleUrl: './secondary-button.component.scss',
})
export class SecondaryButtonComponent {
  label = input<string>('Button');
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
