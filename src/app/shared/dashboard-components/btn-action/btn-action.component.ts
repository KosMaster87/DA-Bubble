/**
 * @fileoverview Action Button Component
 * @description Reusable action button (Save, Submit, etc.)
 * @module shared/dashboard-components/btn-action
 */

import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-btn-action',
  templateUrl: './btn-action.component.html',
  styleUrl: './btn-action.component.scss',
})
export class BtnActionComponent {
  label = input<string>('Save');
  disabled = input<boolean>(false);
  clicked = output<void>();

  onClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
