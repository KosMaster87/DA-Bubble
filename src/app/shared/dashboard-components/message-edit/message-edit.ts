import { Component, effect, input, output, signal } from '@angular/core';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { BtnCancelComponent } from '../btn-cancel/btn-cancel.component';

@Component({
  selector: 'app-message-edit',
  imports: [BtnCancelComponent, BtnActionComponent],
  templateUrl: './message-edit.html',
  styleUrl: './message-edit.scss',
})
export class MessageEdit {
  initialContent = input.required<string>();
  cancelClicked = output<void>();
  saveClicked = output<string>();

  protected editedContent = signal<string>('');

  constructor() {
    // Initialize editedContent when initialContent changes
    effect(() => {
      this.editedContent.set(this.initialContent());
    });
  }

  /**
   * Handle cancel
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onCancel(): void {
    this.cancelClicked.emit();
  }

  /**
   * Handle save
   * @description Emits trimmed edited content only when non-empty.
   */
  onSave(): void {
    const content = this.editedContent().trim();
    if (content) {
      this.saveClicked.emit(content);
    }
  }

  /**
   * Handle textarea input
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.editedContent.set(target.value);
  }
}
