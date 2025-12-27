/**
 * @fileoverview Edit Profile Component
 * @description Popup for editing user profile
 * @module shared/dashboard-components/edit-profile
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
}

@Component({
  selector: 'app-edit-profile',
  imports: [FormsModule, BtnActionComponent, BtnCancelComponent],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss',
})
export class EditProfileComponent {
  user = input.required<EditProfileUser>();
  isVisible = input<boolean>(false);
  closeClicked = output<void>();
  saveClicked = output<{ displayName: string }>();
  displayName = signal<string>('');

  ngOnInit() {
    this.displayName.set(this.user().displayName);
  }

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeClicked.emit();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.displayName.set(this.user().displayName);
    this.closeClicked.emit();
  }

  /**
   * Handle save button click
   */
  onSave(): void {
    this.saveClicked.emit({
      displayName: this.displayName(),
    });
  }

  /**
   * Check if save button should be disabled
   */
  isSaveDisabled(): boolean {
    return !this.displayName() || this.displayName().trim() === '';
  }
}
