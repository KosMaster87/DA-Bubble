/**
 * @fileoverview Delete Button Component
 * @description Reusable delete button for destructive actions
 * @module shared/dashboard-components/btn-delete
 */

import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-btn-delete',
  templateUrl: './btn-delete.component.html',
  styleUrl: './btn-delete.component.scss',
})
export class BtnDeleteComponent {
  label = input<string>('Delete');
  disabled = input<boolean>(false);
  clicked = output<void>();

  onClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
