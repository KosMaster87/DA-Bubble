/**
 * @fileoverview Channel Membership Service
 * @description Handles channel membership operations (join, leave, delete, add members)
 * @module core/services/channel-membership
 */

import { inject, Injectable } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { ChannelStore } from '@stores/channel.store';
import { AuthStore } from '@stores/auth';
import { InvitationService } from '@core/services/invitation/invitation.service';

@Injectable({
  providedIn: 'root',
})
export class ChannelMembershipService {
  private firestore = inject(Firestore);
  private channelStore = inject(ChannelStore);
  private authStore = inject(AuthStore);
  private invitationService = inject(InvitationService);

  /**
   * Add current user to channel members
   * @param channelId Channel ID to join
   */
  joinChannel = async (channelId: string): Promise<void> => {
    const currentUser = this.getCurrentUser();
    const channel = this.getChannelOrThrow(channelId);
    const updatedMembers = this.addUserToMembersList(channel.members, currentUser.uid);
    await this.updateChannelMembers(channelId, updatedMembers, currentUser.uid);
    await this.delay(150);
  };

  /**
   * Get current authenticated user
   * @throws Error if no user authenticated
   */
  private getCurrentUser = () => {
    const user = this.authStore.user();
    if (!user) throw new Error('No authenticated user');
    return user;
  };

  /**
   * Get channel or throw error
   * @param channelId Channel ID to fetch
   * @throws Error if channel not found
   */
  private getChannelOrThrow = (channelId: string) => {
    const channel = this.channelStore.getChannelById()(channelId);
    if (!channel) throw new Error(`Channel not found: ${channelId}`);
    return channel;
  };

  /**
   * Add user to members list (no duplicates)
   * @param members Current members array
   * @param userId User ID to add
   * @returns Updated members array
   */
  private addUserToMembersList = (members: string[], userId: string): string[] => {
    return [...new Set([...members, userId])];
  };

  /**
   * Update channel members in Firestore
   * @param channelId Channel ID
   * @param members Updated members array
   * @param userId User ID being added
   */
  private updateChannelMembers = async (
    channelId: string,
    members: string[],
    userId: string
  ): Promise<void> => {
    await this.channelStore.updateChannel(channelId, { members });
  };

  /**
   * Wait for membership sync in Firestore and local store
   * @param channelId Channel ID to check
   * @param userId User ID to check for membership
   */
  waitForMembershipSync = async (channelId: string, userId: string): Promise<void> => {
    const maxAttempts = 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const synced = await this.checkMembershipSynced(channelId, userId, attempt, maxAttempts);
      if (synced) {
        await this.waitForSecurityRulesCache();
        return;
      }
      if (attempt < maxAttempts) await this.delay(300);
    }
  };

  /**
   * Check if membership is synced in both Firestore and store
   * @param channelId Channel ID
   * @param userId User ID
   * @param attempt Current attempt number
   * @param maxAttempts Maximum attempts
   * @returns True if synced, false otherwise
   */
  private checkMembershipSynced = async (
    channelId: string,
    userId: string,
    attempt: number,
    maxAttempts: number
  ): Promise<boolean> => {
    try {
      const firestoreUpdated = await this.isUserInFirestoreChannel(channelId, userId);
      const storeUpdated = this.isUserInStoreChannel(channelId, userId);

      if (firestoreUpdated && storeUpdated) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  /**
   * Check if user is in Firestore channel members
   * @param channelId Channel ID
   * @param userId User ID
   * @returns True if user is member in Firestore
   */
  private isUserInFirestoreChannel = async (
    channelId: string,
    userId: string
  ): Promise<boolean> => {
    const channelDocRef = doc(this.firestore, `channels/${channelId}`);
    const snapshot = await getDoc(channelDocRef);

    if (!snapshot.exists()) return false;

    const members = snapshot.data()['members'] as string[];
    return members && members.includes(userId);
  };

  /**
   * Check if user is in local store channel members
   * @param channelId Channel ID
   * @param userId User ID
   * @returns True if user is member in store
   */
  private isUserInStoreChannel = (channelId: string, userId: string): boolean => {
    const channel = this.channelStore.getChannelById()(channelId);
    return channel ? channel.members.includes(userId) : false;
  };

  /**
   * Wait for Firestore Security Rules cache to update
   * Reduced delay since retry mechanisms handle remaining cache delays
   */
  private waitForSecurityRulesCache = async (): Promise<void> => {
    const delayMs = 2000;
    await this.delay(delayMs);
  };

  /**
   * Delay helper
   * @param ms Milliseconds to delay
   */
  private delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  /**
   * Complete channel join flow with sync wait
   * @param channelId Channel ID to join
   */
  joinChannelAndWaitForSync = async (channelId: string): Promise<void> => {
    const currentUser = this.getCurrentUser();
    await this.joinChannel(channelId);
    await this.waitForMembershipSync(channelId, currentUser.uid);
  };

  /**
   * Leave channel
   * @param channelId Channel ID to leave
   * @param userId User ID leaving (optional, uses current user if not provided)
   */
  leaveChannel = async (channelId: string, userId?: string): Promise<void> => {
    const userIdToUse = userId || this.authStore.user()?.uid;
    if (!userIdToUse) return;

    const channel = this.channelStore.getChannelById()(channelId);
    if (!channel) return;

    if (channel.createdBy === userIdToUse) {
      return;
    }

    await this.channelStore.leaveChannel(channelId, userIdToUse);
  };

  /**
   * Delete channel (owner only)
   * @param channelId Channel ID to delete
   * @param userId User ID requesting deletion
   * @param channelName Channel name for confirmation
   * @returns True if deleted, false if cancelled or failed
   */
  deleteChannel = async (
    channelId: string,
    userId: string,
    channelName: string
  ): Promise<boolean> => {
    if (!this.validateChannelOwner(channelId, userId)) return false;
    if (!this.confirmChannelDeletion(channelName)) return false;
    return await this.performChannelDeletion(channelId);
  };

  /**
   * Validate user is channel owner
   * @param channelId Channel ID
   * @param userId User ID
   * @returns True if user is owner
   */
  private validateChannelOwner = (channelId: string, userId: string): boolean => {
    const channel = this.channelStore.getChannelById()(channelId);
    if (!channel) return false;

    if (channel.createdBy !== userId) {
      return false;
    }
    return true;
  };

  /**
   * Show confirmation dialog for channel deletion
   * @param channelName Channel name
   * @returns True if confirmed
   */
  private confirmChannelDeletion = (channelName: string): boolean => {
    return confirm(
      `Are you sure you want to delete the channel "${channelName}"? This action cannot be undone.`
    );
  };

  /**
   * Perform channel deletion
   * @param channelId Channel ID
   * @returns True if successful
   */
  private performChannelDeletion = async (channelId: string): Promise<boolean> => {
    try {
      await this.channelStore.deleteChannel(channelId);
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * Remove member from channel
   * @param channelId Channel ID
   * @param memberId Member ID to remove
   */
  removeMember = async (channelId: string, memberId: string): Promise<void> => {
    const channel = this.channelStore.getChannelById()(channelId);
    if (!channel) return;

    const updatedMembers = channel.members.filter((id) => id !== memberId);
    await this.channelStore.updateChannel(channelId, { members: updatedMembers });
  };

  /**
   * Send invitations to users to join channel
   * @param channelId Channel ID
   * @param userIds User IDs to invite
   * @param senderId Sender user ID
   * @param senderName Sender display name
   * @param channelName Channel name
   */
  sendInvitations = async (
    channelId: string,
    userIds: string[],
    senderId: string,
    senderName: string,
    channelName: string
  ): Promise<void> => {
    for (const userId of userIds) {
      try {
        await this.invitationService.createInvitation({
          type: 'channel',
          senderId,
          recipientId: userId,
          channelId,
          channelName,
          message: `${senderName} lädt dich ein, dem Channel #${channelName} beizutreten.`,
        });
      } catch (error) {
      }
    }
  };

  /**
   * Update channel information
   * @param channelId Channel ID
   * @param data Updated channel data
   */
  updateChannelInfo = async (
    channelId: string,
    data: { name?: string; description?: string; isPrivate?: boolean }
  ): Promise<void> => {
    const updates = this.buildChannelUpdates(data);
    if (Object.keys(updates).length > 0) {
      await this.channelStore.updateChannel(channelId, updates);
    }
  };

  /**
   * Build channel updates object from data
   * @param data Update data
   * @returns Updates object
   */
  private buildChannelUpdates = (data: {
    name?: string;
    description?: string;
    isPrivate?: boolean;
  }) => {
    const updates: { name?: string; description?: string; isPrivate?: boolean } = {};
    if (data.name) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.isPrivate !== undefined) updates.isPrivate = data.isPrivate;
    return updates;
  };
}
