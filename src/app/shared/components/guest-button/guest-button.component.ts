/**
 * @fileoverview Guest Button Component
 * @description Standalone component for guest login button
 * @module shared/components/guest-button
 */

import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-guest-button',
  imports: [],
  templateUrl: './guest-button.component.html',
  styleUrl: './guest-button.component.scss',
})
export class GuestButtonComponent {
  type = input<'button' | 'submit'>('button');
  label = input.required<string>();
  disabled = input<boolean>(false);
  loading = input<boolean>(false);

  clicked = output<void>();

  /**
   * Handle guest-button click action.
   * @description Emits click intent only when interaction is allowed so authentication flows cannot be triggered while disabled or loading.
   * @returns {void}
   */
  handleClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit();
    }
  }
}
