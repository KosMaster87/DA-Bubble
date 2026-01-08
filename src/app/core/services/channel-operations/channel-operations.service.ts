/**
 * @fileoverview Channel Operations Service
 * @description Handles all Firestore CRUD operations for channels
 * @module core/services/channel-operations
 */

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayRemove,
  CollectionReference,
  DocumentData,
  Timestamp,
} from '@angular/fire/firestore';
import { Channel, CreateChannelRequest } from '@core/models/channel.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelOperationsService {
  private firestore = inject(Firestore);

  /**
   * Get channels collection reference
   * @returns Collection reference
   */
  getChannelsCollectionRef = (): CollectionReference<DocumentData> => {
    return collection(this.firestore, 'channels');
  };

  /**
   * Get channel document reference
   * @param channelId - Channel ID
   * @returns Document reference
   */
  getChannelDocRef = (channelId: string) => {
    return doc(this.getChannelsCollectionRef(), channelId);
  };

  /**
   * Map Firestore document to Channel object
   * @param docId - Document ID
   * @param data - Document data
   * @returns Mapped channel object
   */
  mapChannelDocument = (docId: string, data: DocumentData): Channel => {
    return {
      id: docId,
      ...data,
      createdAt: this.convertTimestamp(data['createdAt']) || new Date(),
      updatedAt: this.convertTimestamp(data['updatedAt']) || new Date(),
      lastMessageAt: this.convertTimestamp(data['lastMessageAt']) || new Date(),
    } as Channel;
  };

  /**
   * Convert Firestore Timestamp to Date
   * @param timestamp - Firestore timestamp or undefined
   * @returns Date object or undefined
   */
  private convertTimestamp = (timestamp: Timestamp | undefined): Date | undefined => {
    return timestamp?.toDate();
  };

  /**
   * Build complete channel data with defaults
   * @param channelData - Basic channel data
   * @param createdBy - User ID of creator
   * @returns Complete channel data
   */
  buildChannelData = (
    channelData: CreateChannelRequest,
    createdBy: string
  ): Omit<Channel, 'id'> => {
    const now = new Date();
    const uniqueMembers = this.ensureCreatorInMembers(channelData.members, createdBy);
    return {
      ...channelData,
      createdBy,
      admins: [createdBy],
      members: uniqueMembers,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      messageCount: 0,
    };
  };

  /**
   * Ensure creator is in members array
   * @param members - Existing members array
   * @param createdBy - Creator user ID
   * @returns Members array with creator
   */
  private ensureCreatorInMembers = (members: string[], createdBy: string): string[] => {
    return members.includes(createdBy) ? members : [...members, createdBy];
  };

  /**
   * Create new channel in Firestore
   * @param channelData - Channel data
   * @param createdBy - Creator user ID
   * @returns Created channel ID
   */
  async createChannel(channelData: CreateChannelRequest, createdBy: string): Promise<string> {
    const newChannel = this.buildChannelData(channelData, createdBy);
    const docRef = await addDoc(this.getChannelsCollectionRef(), newChannel);
    return docRef.id;
  }

  /**
   * Update channel in Firestore
   * @param channelId - Channel ID
   * @param updates - Updates to apply
   */
  async updateChannel(channelId: string, updates: Partial<Channel>): Promise<void> {
    const channelDoc = this.getChannelDocRef(channelId);
    await updateDoc(channelDoc, { ...updates, updatedAt: new Date() });
  }

  /**
   * Delete channel from Firestore
   * @param channelId - Channel ID
   */
  async deleteChannel(channelId: string): Promise<void> {
    const channelDoc = this.getChannelDocRef(channelId);
    await deleteDoc(channelDoc);
  }

  /**
   * Remove user from channel members
   * @param channelId - Channel ID
   * @param userId - User ID to remove
   */
  async removeUserFromChannel(channelId: string, userId: string): Promise<void> {
    const channelDoc = this.getChannelDocRef(channelId);
    await updateDoc(channelDoc, {
      members: arrayRemove(userId),
      updatedAt: new Date(),
    });
  }
}
