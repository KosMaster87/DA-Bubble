/**
 * @fileoverview Add Members Component
 * @description Popup for adding members to a channel
 * @module shared/dashboard-components/add-members
 */

import { Component, input, output, signal } from '@angular/core';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { BtnActionComponent } from '../btn-action/btn-action.component';

@Component({
  selector: 'app-add-members',
  imports: [InputFieldBasicComponent, BtnActionComponent],
  templateUrl: './add-members.component.html',
  styleUrl: './add-members.component.scss',
})
export class AddMembersComponent {
  isVisible = input<boolean>(false);
  channelName = input<string>('');
  closeClicked = output<void>();
  addMemberClicked = output<string>();
  protected searchQuery = signal<string>('');

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeClicked.emit();
  }

  /**
   * Handle search input change
   */
  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  /**
   * Handle add member button click
   */
  onAddMember(): void {
    if (this.searchQuery().trim()) {
      this.addMemberClicked.emit(this.searchQuery());
      this.searchQuery.set('');
    }
  }

  /**
   * Check if add button should be disabled
   */
  isAddDisabled(): boolean {
    return !this.searchQuery() || this.searchQuery().trim() === '';
  }
}
