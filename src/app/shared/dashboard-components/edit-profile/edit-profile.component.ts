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
  isAdmin?: boolean;
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
  saveClicked = output<{ displayName: string; isAdmin: boolean }>();
  displayName = signal<string>('');
  isAdmin = signal<boolean>(false);

  ngOnInit() {
    this.displayName.set(this.user().displayName);
    this.isAdmin.set(this.user().isAdmin || false);
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
    this.isAdmin.set(this.user().isAdmin || false);
    this.closeClicked.emit();
  }

  /**
   * Handle save button click
   */
  onSave(): void {
    this.saveClicked.emit({
      displayName: this.displayName(),
      isAdmin: this.isAdmin(),
    });
  }

  /**
   * Check if save button should be disabled
   */
  isSaveDisabled(): boolean {
    return !this.displayName() || this.displayName().trim() === '';
  }
}
