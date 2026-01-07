/**
 * @fileoverview Channel Conversation UI Service
 * @description Manages UI state for channel conversation dialogs and modals
 * @module core/services/channel-conversation-ui
 */

import { Injectable, signal, computed } from '@angular/core';

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
   */
  getMembersMenuState = () => this.isMembersMenuOpen.asReadonly();

  /**
   * Get profile view state
   */
  getProfileViewState = () => this.isProfileViewOpen.asReadonly();

  /**
   * Get edit profile state
   */
  getEditProfileState = () => this.isEditProfileOpen.asReadonly();

  /**
   * Get channel info state
   */
  getChannelInfoState = () => this.isChannelInfoOpen.asReadonly();

  /**
   * Get add members state
   */
  getAddMembersState = () => this.isAddMembersOpen.asReadonly();

  /**
   * Get selected member ID
   */
  getSelectedMemberId = () => this.selectedMemberId.asReadonly();

  /**
   * Open members menu
   */
  openMembersMenu = (): void => {
    this.isMembersMenuOpen.set(true);
  };

  /**
   * Close members menu
   */
  closeMembersMenu = (): void => {
    this.isMembersMenuOpen.set(false);
  };

  /**
   * Open profile view for user
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
   */
  closeProfileView = (): void => {
    this.isProfileViewOpen.set(false);
    this.selectedMemberId.set(null);
  };

  /**
   * Open edit profile
   */
  openEditProfile = (): void => {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  };

  /**
   * Close edit profile
   */
  closeEditProfile = (): void => {
    this.isEditProfileOpen.set(false);
  };

  /**
   * Open channel info
   */
  openChannelInfo = (): void => {
    this.isChannelInfoOpen.set(true);
  };

  /**
   * Close channel info
   */
  closeChannelInfo = (): void => {
    this.isChannelInfoOpen.set(false);
  };

  /**
   * Open add members dialog
   */
  openAddMembers = (): void => {
    this.isMembersMenuOpen.set(false);
    this.isAddMembersOpen.set(true);
  };

  /**
   * Close add members dialog
   */
  closeAddMembers = (): void => {
    this.isAddMembersOpen.set(false);
  };

  /**
   * Reset all UI states
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
