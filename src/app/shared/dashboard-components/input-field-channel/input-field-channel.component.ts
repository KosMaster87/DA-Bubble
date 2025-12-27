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

  ngOnInit() {
    this.inputValue.set(this.value());
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue.set(value);
    this.valueChange.emit(value);
  }
}
