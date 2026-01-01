/**
 * @fileoverview Checkbox Private Channel Component
 * @description Reusable checkbox for marking channels as private
 * @module shared/dashboard-components/checkbox-private-channel
 */

import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-checkbox-private-channel',
  imports: [],
  templateUrl: './checkbox-private-channel.component.html',
  styleUrl: './checkbox-private-channel.component.scss',
})
export class CheckboxPrivateChannelComponent {
  checked = input<boolean>(false);
  disabled = input<boolean>(false);
  checkedChange = output<boolean>();

  /**
   * Handle checkbox change
   */
  onChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.checkedChange.emit(checkbox.checked);
  }
}
