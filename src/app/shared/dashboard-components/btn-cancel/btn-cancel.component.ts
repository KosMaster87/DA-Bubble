/**
 * @fileoverview Cancel Button Component
 * @description Reusable cancel button
 * @module shared/dashboard-components/btn-cancel
 */

import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-btn-cancel',
  templateUrl: './btn-cancel.component.html',
  styleUrl: './btn-cancel.component.scss',
})
export class BtnCancelComponent {
  label = input<string>('Cancel');
  clicked = output<void>();

  onClick(): void {
    this.clicked.emit();
  }
}
