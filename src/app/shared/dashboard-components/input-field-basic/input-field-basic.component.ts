/**
 * @fileoverview Input Field Component
 * @description Reusable input field for forms
 * @module shared/dashboard-components/input-field-basic
 */

import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-field-basic',
  imports: [FormsModule],
  templateUrl: './input-field-basic.component.html',
  styleUrl: './input-field-basic.component.scss',
})
export class InputFieldBasicComponent {
  placeholder = input<string>('');
  value = input<string>('');
  disabled = input<boolean>(false);
  readonly = input<boolean>(false);
  valueChange = output<string>();
  focused = output<void>();

  protected inputValue = signal<string>('');

  /**
   * Initialize local input signal from bound initial value.
   * @description Seeds component-local state from input binding so first render reflects parent-provided form data.
   * @returns {void}
   */
  ngOnInit() {
    this.inputValue.set(this.value());
  }

  /**
   * Handle native input changes for basic field.
   * @description Updates local signal and emits value changes so consuming forms can react without reading DOM state directly.
   * @param {Event} event - Input event from text field
   * @returns {void}
   */
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue.set(value);
    this.valueChange.emit(value);
  }
}
