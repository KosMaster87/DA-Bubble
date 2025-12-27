/**
 * @fileoverview Create Channel Component
 * @description Popup for creating a new channel
 * @module shared/dashboard-components/create-channel
 */

import { Component, input, output, signal } from '@angular/core';
import { InputFieldChannelComponent } from '../input-field-channel/input-field-channel.component';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { BtnActionComponent } from '../btn-action/btn-action.component';

@Component({
  selector: 'app-create-channel',
  imports: [InputFieldChannelComponent, InputFieldBasicComponent, BtnActionComponent],
  templateUrl: './create-channel.component.html',
  styleUrl: './create-channel.component.scss',
})
export class CreateChannelComponent {
  isVisible = input<boolean>(false);
  closeClicked = output<void>();
  createClicked = output<{ name: string; description: string }>();

  protected channelName = signal<string>('');
  protected channelDescription = signal<string>('');

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeClicked.emit();
    this.resetForm();
  }

  /**
   * Handle channel name change
   */
  onChannelNameChange(value: string): void {
    this.channelName.set(value);
  }

  /**
   * Handle description change
   */
  onDescriptionChange(value: string): void {
    this.channelDescription.set(value);
  }

  /**
   * Handle create button click
   */
  onCreate(): void {
    if (this.channelName().trim()) {
      this.createClicked.emit({
        name: this.channelName(),
        description: this.channelDescription(),
      });
      this.resetForm();
    }
  }

  /**
   * Reset form fields
   */
  private resetForm(): void {
    this.channelName.set('');
    this.channelDescription.set('');
  }

  /**
   * Check if create button should be disabled
   */
  isCreateDisabled(): boolean {
    return !this.channelName() || this.channelName().trim() === '';
  }
}
