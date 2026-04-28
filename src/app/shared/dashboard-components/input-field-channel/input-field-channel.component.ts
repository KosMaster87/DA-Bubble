/**
 * @fileoverview Input Field Channel Component
 * @description Reusable input field with icon for channel forms
 * @module shared/dashboard-components/input-field-channel
 */

import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-field-channel',
  imports: [FormsModule],
  templateUrl: './input-field-channel.component.html',
  styleUrl: './input-field-channel.component.scss',
})
export class InputFieldChannelComponent {
  placeholder = input<string>('');
  value = input<string>('');
  disabled = input<boolean>(false);
  iconSrc = input<string>('');
  valueChange = output<string>();

  protected inputValue = signal<string>('');

  /**
   * Initialize local input signal from bound initial value.
   * @description Mirrors incoming value input once on init so component-internal signal state starts aligned with parent bindings.
   * @returns {void}
   */
  ngOnInit() {
    this.inputValue.set(this.value());
  }

  /**
   * Handle native input changes for channel field.
   * @description Mirrors DOM input into local signal and emits value changes so reactive parent forms stay synchronized.
   * @param {Event} event - Input event from text field
   * @returns {void}
   */
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue.set(value);
    this.valueChange.emit(value);
  }
}
