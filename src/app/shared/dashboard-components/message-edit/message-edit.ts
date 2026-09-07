import { Component, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
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
  protected isEmojiPickerOpen = signal<boolean>(false);
  protected readonly emojis = [
    { value: '👍', label: 'Thumbs up' },
    { value: '✅', label: 'Checked' },
    { value: '🚀', label: 'Rocket' },
    { value: '🤓', label: 'Nerd face' },
  ];
  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('editTextarea');

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

  /** Toggles the emoji picker for the edit textarea. */
  toggleEmojiPicker(): void {
    this.isEmojiPickerOpen.update((isOpen) => !isOpen);
  }

  /** Inserts an emoji at the current caret position and returns focus to the textarea. */
  onEmojiSelect(emoji: string): void {
    const textarea = this.textarea().nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = this.editedContent();

    this.editedContent.set(`${content.slice(0, start)}${emoji}${content.slice(end)}`);
    this.isEmojiPickerOpen.set(false);

    queueMicrotask(() => {
      const caretPosition = start + emoji.length;
      textarea.focus();
      textarea.setSelectionRange(caretPosition, caretPosition);
    });
  }
}
