/**
 * @fileoverview Channel Info Component
 * @description Popup for viewing and editing channel information
 * @module shared/dashboard-components/channel-info
 */

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChannelDataService } from '@core/services/channel-data/channel-data.service';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { BtnDeleteComponent } from '../btn-delete/btn-delete.component';
import { CheckboxPrivateChannelComponent } from '../checkbox-private-channel/checkbox-private-channel.component';
import { UserListItemComponent } from '../user-list-item/user-list-item.component';

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
   * @description Loads reactive member list data for the active channel via the channel data service.
   */
  protected members = computed(() => {
    const channelId = computed(() => this.channel().id);
    return this.channelDataService.getChannelMembers(channelId)();
  });

  /**
   * Handle close button click
   * @description Emits close intent and cancels inline edits so modal exits with clean editing state.
   */
  onClose(): void {
    this.closeClicked.emit();
    this.cancelEditing();
  }

  /**
   * Start editing channel name
   * @description Initializes name edit mode by copying persisted channel name into local editable state.
   */
  onEditName(): void {
    this.editedName.set(this.channel().name);
    this.isEditingName.set(true);
  }

  /**
   * Save edited channel name
   * @description Emits a name update only when the trimmed value changed, then exits name edit mode.
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
   * @description Initializes description edit mode by copying persisted channel text into editable local state.
   */
  onEditDescription(): void {
    this.editedDescription.set(this.channel().description);
    this.isEditingDescription.set(true);
  }

  /**
   * Save edited channel description
   * @description Emits description updates only when content actually changed, then exits description edit mode.
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
   * @description Resets both edit flags so name and description editors close together.
   */
  private cancelEditing(): void {
    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
  }

  /**
   * Handle leave channel button click
   * @description Emits leave intent so parent-level orchestration can run permission checks and navigation flow.
   */
  onLeaveChannel(): void {
    this.leaveChannelClicked.emit();
  }

  /**
   * Handle delete channel button click
   * @description Emits delete intent so parent-level orchestration can run confirmation and destructive workflows.
   */
  onDeleteChannel(): void {
    this.deleteChannelClicked.emit();
  }

  /**
   * Handle created by user click
   * @description Emits the creator UID so profile/detail views can be opened from channel metadata.
   */
  onCreatedByClick(): void {
    this.createdByClicked.emit(this.channel().createdBy);
  }

  /**
   * Handle admin user click
   * @description Emits selected admin UID to trigger profile/detail navigation from the admin list.
   */
  onAdminClick(adminUid: string): void {
    this.createdByClicked.emit(adminUid);
  }

  /**
   * Handle member click
   * @description Emits selected member UID to trigger profile/detail navigation from the members list.
   */
  onMemberClick(memberId: string): void {
    this.memberClicked.emit(memberId);
  }

  /**
   * Handle private checkbox change
   * @description Emits privacy updates only when the checkbox state differs from current channel privacy.
   */
  onPrivateChange(checked: boolean): void {
    if (checked !== this.channel().isPrivate) {
      this.channelUpdated.emit({ isPrivate: checked });
    }
  }
}
