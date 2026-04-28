/**
 * @fileoverview Delete Message Confirmation Modal
 * @description Modal for confirming message deletion
 * @module shared/dashboard-components/delete-message-modal
 */

import { Component, input, output } from '@angular/core';
import { BtnCancelComponent } from '../btn-cancel/btn-cancel.component';
import { BtnDeleteComponent } from '../btn-delete/btn-delete.component';

@Component({
  selector: 'app-delete-message-modal',
  imports: [BtnDeleteComponent, BtnCancelComponent],
  templateUrl: './delete-message-modal.component.html',
  styleUrl: './delete-message-modal.component.scss',
})
export class DeleteMessageModalComponent {
  isVisible = input<boolean>(false);
  cancelClicked = output<void>();
  confirmClicked = output<void>();

  /**
   * Handle cancel action in delete confirmation modal.
   * @description Emits cancel intent to the parent so modal visibility and side effects remain controlled by the caller.
   * @returns {void}
   */
  onCancel(): void {
    this.cancelClicked.emit();
  }

  /**
   * Handle confirm action in delete confirmation modal.
   * @description Emits confirmation intent without performing deletion locally so destructive logic stays outside the presentational modal.
   * @returns {void}
   */
  onConfirm(): void {
    this.confirmClicked.emit();
  }
}
