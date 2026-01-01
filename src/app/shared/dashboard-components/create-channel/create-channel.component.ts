/**
 * @fileoverview Create Channel Component
 * @description Popup for creating a new channel
 * @module shared/dashboard-components/create-channel
 */

import { Component, input, output, signal } from '@angular/core';
import { InputFieldChannelComponent } from '../input-field-channel/input-field-channel.component';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { CheckboxPrivateChannelComponent } from '../checkbox-private-channel/checkbox-private-channel.component';

@Component({
  selector: 'app-create-channel',
  imports: [
    InputFieldChannelComponent,
    InputFieldBasicComponent,
    BtnActionComponent,
    CheckboxPrivateChannelComponent,
  ],
  templateUrl: './create-channel.component.html',
  styleUrl: './create-channel.component.scss',
})
export class CreateChannelComponent {
  isVisible = input<boolean>(false);
  closeClicked = output<void>();
  createClicked = output<{ name: string; description: string; isPrivate: boolean }>();

  protected channelName = signal<string>('');
  protected channelDescription = signal<string>('');
  protected isPrivate = signal<boolean>(false);

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
   * Handle private checkbox change
   */
  onPrivateChange(checked: boolean): void {
    this.isPrivate.set(checked);
  }

  /**
   * Handle create button click
   */
  onCreate(): void {
    if (this.channelName().trim()) {
      this.createClicked.emit({
        name: this.channelName(),
        description: this.channelDescription(),
        isPrivate: this.isPrivate(),
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
    this.isPrivate.set(false);
  }

  /**
   * Check if create button should be disabled
   */
  isCreateDisabled(): boolean {
    return !this.channelName() || this.channelName().trim() === '';
  }
}
