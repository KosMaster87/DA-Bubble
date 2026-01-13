/**
 * @fileoverview Mobile Back Button Component
 * @description Reusable back button for mobile navigation
 * @module shared/dashboard-components/mobile-back-button
 */

import { Component, output } from '@angular/core';

@Component({
  selector: 'app-mobile-back-button',
  imports: [],
  template: `
    <button
      class="mobile-back-button"
      type="button"
      (click)="backClicked.emit()"
      aria-label="Go back"
    >
      <img src="/img/icon/arrow_default.svg" alt="" class="mobile-back-button__icon" />
    </button>
  `,
  styleUrl: './mobile-back-button.component.scss',
})
export class MobileBackButtonComponent {
  backClicked = output<void>();
}
