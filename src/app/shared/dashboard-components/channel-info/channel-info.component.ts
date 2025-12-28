/**
 * @fileoverview Channel Info Component
 * @description Popup for viewing and editing channel information
 * @module shared/dashboard-components/channel-info
 */

import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BtnActionComponent } from '../btn-action/btn-action.component';

export interface ChannelInfoData {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdByName: string;
}

@Component({
  selector: 'app-channel-info',
  imports: [FormsModule, BtnActionComponent],
  templateUrl: './channel-info.component.html',
  styleUrl: './channel-info.component.scss',
})
export class ChannelInfoComponent {
  channel = input.required<ChannelInfoData>();
  isVisible = input<boolean>(false);

  closeClicked = output<void>();
  channelUpdated = output<{ name?: string; description?: string }>();
  leaveChannelClicked = output<void>();
  createdByClicked = output<string>();

  protected isEditingName = signal(false);
  protected isEditingDescription = signal(false);
  protected editedName = signal('');
  protected editedDescription = signal('');

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeClicked.emit();
    this.cancelEditing();
  }

  /**
   * Start editing channel name
   */
  onEditName(): void {
    this.editedName.set(this.channel().name);
    this.isEditingName.set(true);
  }

  /**
   * Save edited channel name
   */
  onSaveName(): void {
    const newName = this.editedName().trim();
    if (newName && newName !== this.channel().name) {
      this.channelUpdated.emit({ name: newName });
    }
    this.isEditingName.set(false);
  }

  /**
   * Start editing channel description
   */
  onEditDescription(): void {
    this.editedDescription.set(this.channel().description);
    this.isEditingDescription.set(true);
  }

  /**
   * Save edited channel description
   */
  onSaveDescription(): void {
    const newDescription = this.editedDescription().trim();
    if (newDescription !== this.channel().description) {
      this.channelUpdated.emit({ description: newDescription });
    }
    this.isEditingDescription.set(false);
  }

  /**
   * Cancel all editing
   */
  private cancelEditing(): void {
    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
  }

  /**
   * Handle leave channel button click
   */
  onLeaveChannel(): void {
    this.leaveChannelClicked.emit();
  }

  /**
   * Handle created by user click
   */
  onCreatedByClick(): void {
    this.createdByClicked.emit(this.channel().createdBy);
  }
}
