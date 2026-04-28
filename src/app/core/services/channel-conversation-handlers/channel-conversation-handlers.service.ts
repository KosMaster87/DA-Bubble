/**
 * @fileoverview Channel Conversation Handlers Service
 * @description Event handlers for channel conversation actions
 * @module features/dashboard/components/channel-conversation
 */

import { Injectable, inject } from '@angular/core';
import { ChannelConversationUIService } from '@core/services/channel-conversation-ui/channel-conversation-ui.service';
import { ChannelMembershipService } from '@core/services/channel-membership/channel-membership.service';
import { ProfileManagementService } from '@core/services/profile-management/profile-management.service';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/index';

@Injectable({ providedIn: 'root' })
export class ChannelConversationHandlersService {
  private authStore = inject(AuthStore);
  private channelStore = inject(ChannelStore);
  private channelMembership = inject(ChannelMembershipService);
  private profileManagement = inject(ProfileManagementService);
  private channelConversationUI = inject(ChannelConversationUIService);

  /**
   * Handle members added - send invitations
   * @description Orchestrates the invitation flow when new members are confirmed in the channel settings dialog.
   * @param channelId - Channel ID
   * @param userIds - User IDs to add
   */
  handleMembersAdded = async (channelId: string, userIds: string[]): Promise<void> => {
    const channel = this.channelStore.getChannelById()(channelId);
    const currentUser = this.authStore.user();

    if (!this.validateAddMembersData(channel, currentUser)) return;

    await this.sendMemberInvitations(channel!, currentUser!, userIds);
    this.channelConversationUI.closeAddMembers();
  };

  /**
   * Validate channel and user data for adding members
   * @description Guards the invitation flow — ensures channel and current user are resolved before async operations begin.
   * @param channel - Channel data
   * @param currentUser - Current user
   * @returns True if valid
   */
  private validateAddMembersData = (channel: any, currentUser: any): boolean => {
    if (!channel || !currentUser) {
      console.error('❌ Channel or current user not found');
      return false;
    }
    return true;
  };

  /**
   * Send invitations to new members
   * @description Dispatches one invitation per selected user via ChannelMembershipService and closes the add-members panel on completion.
   * @param channel - Channel data
   * @param currentUser - Current user
   * @param userIds - User IDs to invite
   */
  private sendMemberInvitations = async (
    channel: any,
    currentUser: any,
    userIds: string[],
  ): Promise<void> => {
    await this.channelMembership.sendInvitations(
      channel.id,
      userIds,
      currentUser.uid,
      currentUser.displayName,
      channel.name,
    );
    console.log('✉️ Sent invitations to:', userIds.length, 'users');
  };

  /**
   * Handle channel accepted
   * @description Coordinates the full join lifecycle — fires loading feedback, performs the guarded join with sync wait, then restores UI.
   * @param channelId - Channel ID
   * @param onJoiningStart - Callback when joining starts
   * @param onJoiningEnd - Callback when joining ends
   */
  handleChannelAccepted = async (
    channelId: string,
    onJoiningStart: () => void,
    onJoiningEnd: () => void,
  ): Promise<void> => {
    console.log('✅ User accepted channel rules and joining:', channelId);
    onJoiningStart();

    try {
      await this.channelMembership.joinChannelAndWaitForSync(channelId);
      onJoiningEnd();
      console.log('✅ Join complete - access screen hidden');
    } catch (error) {
      console.error('❌ Error joining channel:', error);
      onJoiningEnd();
    }
  };

  /**
   * Handle remove member from channel
   * @description Removes a single member and resets the profile-view panel so the sidebar returns to its default state.
   * @param channelId - Channel ID
   * @param memberId - Member ID to remove
   */
  handleRemoveMember = async (channelId: string, memberId: string): Promise<void> => {
    await this.channelMembership.removeMember(channelId, memberId);
    this.channelConversationUI.closeProfileView();
  };

  /**
   * Handle edit profile save
   * @description Persists profile changes, dismisses the edit form, and catches errors so the UI does not hard-crash on failure.
   * @param userId - User ID to update
   * @param data - Profile data
   */
  handleEditProfileSave = async (
    userId: string,
    data: { displayName: string; isAdmin: boolean },
  ): Promise<void> => {
    try {
      await this.profileManagement.updateUserProfile(userId, data);
      console.log('✅ User profile updated:', data);
      this.channelConversationUI.closeEditProfile();
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
    }
  };

  /**
   * Handle channel info updated
   * @description Delegates metadata changes (name, description, privacy) to the membership service without adding UI logic here.
   * @param channelId - Channel ID
   * @param data - Updated channel data
   */
  handleChannelUpdated = async (
    channelId: string,
    data: { name?: string; description?: string; isPrivate?: boolean },
  ): Promise<void> => {
    await this.channelMembership.updateChannelInfo(channelId, data);
  };

  /**
   * Handle leave channel
   * @description Wraps the leave operation with error containment and returns a boolean so callers can react to failure without coupling to internals.
   * @param channelId - Channel ID
   * @param currentUserId - Current user ID
   * @returns True if successfully left
   */
  handleLeaveChannel = async (channelId: string, currentUserId: string): Promise<boolean> => {
    try {
      await this.channelMembership.leaveChannel(channelId, currentUserId);
      return true;
    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
      return false;
    }
  };

  /**
   * Handle delete channel
   * @description Entry point for the owner-guarded delete flow; owner-check and confirmation dialog are handled downstream in ChannelMembershipService.
   * @param channelId - Channel ID
   * @param currentUserId - Current user ID
   * @param channelName - Channel name
   * @returns True if successfully deleted
   */
  handleDeleteChannel = async (
    channelId: string,
    currentUserId: string,
    channelName: string,
  ): Promise<boolean> => {
    return await this.channelMembership.deleteChannel(channelId, currentUserId, channelName);
  };
}
