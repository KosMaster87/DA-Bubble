/**
 * @fileoverview Channel Info Component
 * @description Popup for viewing and editing channel information
 * @module shared/dashboard-components/channel-info
 */

import { Component, input, output, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { BtnDeleteComponent } from '../btn-delete/btn-delete.component';
import { CheckboxPrivateChannelComponent } from '../checkbox-private-channel/checkbox-private-channel.component';
import { UserListItemComponent } from '../user-list-item/user-list-item.component';
import { ChannelDataService } from '@core/services/channel-data/channel-data.service';

export interface ChannelInfoData {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: string;
  createdByName: string;
  admins: Array<{ uid: string; name: string }>;
}

@Component({
  selector: 'app-channel-info',
  imports: [
    FormsModule,
    BtnActionComponent,
    BtnDeleteComponent,
    CheckboxPrivateChannelComponent,
    UserListItemComponent,
  ],
  templateUrl: './channel-info.component.html',
  styleUrl: './channel-info.component.scss',
})
export class ChannelInfoComponent {
  private channelDataService = inject(ChannelDataService);

  channel = input.required<ChannelInfoData>();
  isVisible = input<boolean>(false);
  currentUserId = input<string>();

  closeClicked = output<void>();
  channelUpdated = output<{ name?: string; description?: string; isPrivate?: boolean }>();
  leaveChannelClicked = output<void>();
  deleteChannelClicked = output<void>();
  createdByClicked = output<string>();
  memberClicked = output<string>();

  protected isEditingName = signal(false);
  protected isEditingDescription = signal(false);
  protected editedName = signal('');
  protected editedDescription = signal('');

  /**
   * Get channel members list
   */
  protected members = computed(() => {
    const channelId = computed(() => this.channel().id);
    return this.channelDataService.getChannelMembers(channelId)();
  });

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
   * Handle delete channel button click
   */
  onDeleteChannel(): void {
    this.deleteChannelClicked.emit();
  }

  /**
   * Handle created by user click
   */
  onCreatedByClick(): void {
    this.createdByClicked.emit(this.channel().createdBy);
  }

  /**
   * Handle admin user click
   */
  onAdminClick(adminUid: string): void {
    this.createdByClicked.emit(adminUid);
  }

  /**
   * Handle member click
   */
  onMemberClick(memberId: string): void {
    this.memberClicked.emit(memberId);
  }

  /**
   * Handle private checkbox change
   */
  onPrivateChange(checked: boolean): void {
    if (checked !== this.channel().isPrivate) {
      this.channelUpdated.emit({ isPrivate: checked });
    }
  }
}
