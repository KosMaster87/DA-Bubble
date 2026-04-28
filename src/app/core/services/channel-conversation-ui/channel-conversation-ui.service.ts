/**
 * @fileoverview Channel Conversation UI Service
 * @description Centralizes channel-conversation overlay state so profile, members, and channel-info panels remain mutually consistent.
 * @module core/services/channel-conversation-ui
 */

import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ChannelConversationUIService {
  private isMembersMenuOpen = signal<boolean>(false);
  private isProfileViewOpen = signal<boolean>(false);
  private isEditProfileOpen = signal<boolean>(false);
  private isChannelInfoOpen = signal<boolean>(false);
  private isAddMembersOpen = signal<boolean>(false);
  private selectedMemberId = signal<string | null>(null);

  /**
   * Get members menu state
   * @description Exposes a readonly signal so templates can react to menu visibility without direct write access.
   */
  getMembersMenuState = () => this.isMembersMenuOpen.asReadonly();

  /**
   * Get profile view state
   * @description Exposes a readonly signal for the profile overlay so components can conditionally render it.
   */
  getProfileViewState = () => this.isProfileViewOpen.asReadonly();

  /**
   * Get edit profile state
   * @description Exposes a readonly signal for the edit-profile overlay.
   */
  getEditProfileState = () => this.isEditProfileOpen.asReadonly();

  /**
   * Get channel info state
   * @description Exposes a readonly signal for the channel-info panel.
   */
  getChannelInfoState = () => this.isChannelInfoOpen.asReadonly();

  /**
   * Get add members state
   * @description Exposes a readonly signal for the add-members dialog.
   */
  getAddMembersState = () => this.isAddMembersOpen.asReadonly();

  /**
   * Get selected member ID
   * @description Exposes a readonly signal for the currently inspected member, used by profile and edit-profile overlays.
   */
  getSelectedMemberId = () => this.selectedMemberId.asReadonly();

  /**
   * Open members menu
   * @description Shows the members list panel. Other panels remain unaffected — callers must close them separately.
   */
  openMembersMenu = (): void => {
    this.isMembersMenuOpen.set(true);
  };

  /**
   * Close members menu
   * @description Hides the members list panel.
   */
  closeMembersMenu = (): void => {
    this.isMembersMenuOpen.set(false);
  };

  /**
   * Open profile view for user
   * @description Opens the profile overlay for a specific user and ensures conflicting panels (members menu, channel info) are closed first.
   * @param userId User ID to view
   */
  openProfileView = (userId: string): void => {
    this.selectedMemberId.set(userId);
    this.isMembersMenuOpen.set(false);
    this.isChannelInfoOpen.set(false);
    this.isProfileViewOpen.set(true);
  };

  /**
   * Close profile view
   * @description Hides the profile overlay and clears the selected member so state is clean for the next open.
   */
  closeProfileView = (): void => {
    this.isProfileViewOpen.set(false);
    this.selectedMemberId.set(null);
  };

  /**
   * Open edit profile
   * @description Transitions from profile-view to edit mode by swapping the visible panel without resetting the selected member.
   */
  openEditProfile = (): void => {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  };

  /**
   * Close edit profile
   * @description Dismisses the edit form. Any unsaved changes are discarded at this point.
   */
  closeEditProfile = (): void => {
    this.isEditProfileOpen.set(false);
  };

  /**
   * Open channel info
   * @description Shows the channel info sidebar panel for editing name/description.
   */
  openChannelInfo = (): void => {
    this.isChannelInfoOpen.set(true);
  };

  /**
   * Close channel info
   * @description Hides the channel info sidebar panel.
   */
  closeChannelInfo = (): void => {
    this.isChannelInfoOpen.set(false);
  };

  /**
   * Open add members dialog
   * @description Closes the members menu and opens the add-members dialog, ensuring only one panel is visible at a time.
   */
  openAddMembers = (): void => {
    this.isMembersMenuOpen.set(false);
    this.isAddMembersOpen.set(true);
  };

  /**
   * Close add members dialog
   * @description Dismisses the add-members dialog.
   */
  closeAddMembers = (): void => {
    this.isAddMembersOpen.set(false);
  };

  /**
   * Reset all UI states
   * @description Collapses all open overlays and clears the selected member — used on navigation away or component teardown.
   */
  resetAll = (): void => {
    this.isMembersMenuOpen.set(false);
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(false);
    this.isChannelInfoOpen.set(false);
    this.isAddMembersOpen.set(false);
    this.selectedMemberId.set(null);
  };
}
