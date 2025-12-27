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

  ngOnInit() {
    this.inputValue.set(this.value());
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue.set(value);
    this.valueChange.emit(value);
  }
}
