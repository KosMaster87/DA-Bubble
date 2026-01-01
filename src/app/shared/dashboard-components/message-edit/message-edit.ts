import { Component, input, output, signal, effect } from '@angular/core';
import { BtnCancelComponent } from '../btn-cancel/btn-cancel.component';
import { BtnActionComponent } from '../btn-action/btn-action.component';

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
   */
  onCancel(): void {
    this.cancelClicked.emit();
  }

  /**
   * Handle save
   */
  onSave(): void {
    const content = this.editedContent().trim();
    if (content) {
      this.saveClicked.emit(content);
    }
  }

  /**
   * Handle textarea input
   */
  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.editedContent.set(target.value);
  }
}
