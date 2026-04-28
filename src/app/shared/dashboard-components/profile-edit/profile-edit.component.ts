/**
 * @fileoverview Profile Edit Component
 * @description Popup for editing user profile
 * @module shared/dashboard-components/profile-edit
 */

import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { BtnCancelComponent } from '../btn-cancel/btn-cancel.component';

export interface EditProfileUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isAdmin?: boolean;
}

@Component({
  selector: 'app-profile-edit',
  imports: [FormsModule, BtnActionComponent, BtnCancelComponent],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.scss',
})
export class ProfileEditComponent {
  user = input.required<EditProfileUser>();
  isVisible = input<boolean>(false);
  closeClicked = output<void>();
  saveClicked = output<{ displayName: string; isAdmin: boolean }>();
  displayName = signal<string>('');
  isAdmin = signal<boolean>(false);

  ngOnInit() {
    this.displayName.set(this.user().displayName);
    this.isAdmin.set(this.user().isAdmin || false);
  }

  /**
   * Handle close button click
   * @description Emits close intent so parent workflow can dismiss the modal without mutating profile data.
   */
  onClose(): void {
    this.closeClicked.emit();
  }

  /**
   * Handle display name input change
   * @description Synchronizes local display-name signal from the input event for immediate form-state feedback.
   */
  onDisplayNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.displayName.set(input.value);
  }

  /**
   * Handle cancel button click
   * @description Restores original user values and closes edit mode without persisting modifications.
   */
  onCancel(): void {
    this.displayName.set(this.user().displayName);
    this.isAdmin.set(this.user().isAdmin || false);
    this.closeClicked.emit();
  }

  /**
   * Handle save button click
   * @description Emits the currently staged profile fields as the single save payload for parent-level persistence.
   */
  onSave(): void {
    this.saveClicked.emit({
      displayName: this.displayName(),
      isAdmin: this.isAdmin(),
    });
  }

  /**
   * Check if save button should be disabled
   * @description Prevents submissions when display name is blank after trimming.
   */
  isSaveDisabled(): boolean {
    return !this.displayName() || this.displayName().trim() === '';
  }
}
