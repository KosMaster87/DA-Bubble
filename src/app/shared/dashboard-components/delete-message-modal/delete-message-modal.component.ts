/**
 * @fileoverview Delete Message Confirmation Modal
 * @description Modal for confirming message deletion
 * @module shared/dashboard-components/delete-message-modal
 */

import { Component, input, output } from '@angular/core';
import { BtnDeleteComponent } from '../btn-delete/btn-delete.component';
import { BtnCancelComponent } from '../btn-cancel/btn-cancel.component';

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

  onCancel(): void {
    this.cancelClicked.emit();
  }

  onConfirm(): void {
    this.confirmClicked.emit();
  }
}
