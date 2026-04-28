/**
 * @fileoverview Create Channel Component
 * @description Popup for creating a new channel
 * @module shared/dashboard-components/create-channel
 */

import { Component, input, output, signal } from '@angular/core';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { CheckboxPrivateChannelComponent } from '../checkbox-private-channel/checkbox-private-channel.component';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { InputFieldChannelComponent } from '../input-field-channel/input-field-channel.component';

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
   * @description Closes the create-channel dialog and resets local form state.
   */
  onClose(): void {
    this.closeClicked.emit();
    this.resetForm();
  }

  /**
   * Handle channel name change
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onChannelNameChange(value: string): void {
    this.channelName.set(value);
  }

  /**
   * Handle description change
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onDescriptionChange(value: string): void {
    this.channelDescription.set(value);
  }

  /**
   * Handle private checkbox change
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onPrivateChange(checked: boolean): void {
    this.isPrivate.set(checked);
  }

  /**
   * Handle create button click
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
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
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  private resetForm(): void {
    this.channelName.set('');
    this.channelDescription.set('');
    this.isPrivate.set(false);
  }

  /**
   * Check if create button should be disabled
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   */
  isCreateDisabled(): boolean {
    return !this.channelName() || this.channelName().trim() === '';
  }
}
