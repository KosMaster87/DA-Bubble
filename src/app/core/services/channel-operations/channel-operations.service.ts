/**
 * @fileoverview Channel Operations Service
 * @description Encapsulates channel document persistence operations so channel lifecycle writes remain consistent across features.
 * @module core/services/channel-operations
 */

import { Injectable, inject } from '@angular/core';
import {
  CollectionReference,
  DocumentData,
  Firestore,
  Timestamp,
  addDoc,
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
import { Channel, CreateChannelRequest } from '@core/models/channel.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelOperationsService {
  private firestore = inject(Firestore);

  /**
   * Get channels collection reference
   * @description Central Firestore path factory so all read/write operations use a consistent collection reference.
   * @returns Collection reference
   */
  getChannelsCollectionRef = (): CollectionReference<DocumentData> => {
    return collection(this.firestore, 'channels');
  };

  /**
   * Get channel document reference
   * @description Constructs the exact Firestore document path for a single channel to enable targeted reads and writes.
   * @param channelId - Channel ID
   * @returns Document reference
   */
  getChannelDocRef = (channelId: string) => {
    return doc(this.getChannelsCollectionRef(), channelId);
  };

  /**
   * Map Firestore document to Channel object
   * @description Normalises Firestore Timestamps to Date objects and merges document ID with the rest of the data.
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
   * @description Converts optional timestamp values defensively so caller code can avoid repetitive undefined guards.
   * @param timestamp - Firestore timestamp or undefined
   * @returns Date object or undefined
   */
  private convertTimestamp = (timestamp: Timestamp | undefined): Date | undefined => {
    return timestamp?.toDate();
  };

  /**
   * Build complete channel data with defaults
   * @description Merges the request payload with system-generated defaults (timestamps, admins, unique member list) before writing to Firestore.
   * @param channelData - Basic channel data
   * @param createdBy - User ID of creator
   * @returns Complete channel data
   */
  buildChannelData = (
    channelData: CreateChannelRequest,
    createdBy: string,
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
   * @description Prevents the creator from being excluded if the caller passes a members list that omits them.
   * @param members - Existing members array
   * @param createdBy - Creator user ID
   * @returns Members array with creator
   */
  private ensureCreatorInMembers = (members: string[], createdBy: string): string[] => {
    return members.includes(createdBy) ? members : [...members, createdBy];
  };

  /**
   * Create new channel in Firestore
   * @description Builds the full channel document with defaults and persists it; returns the generated ID for downstream use.
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
   * @description Merges the provided partial update with an auto-generated updatedAt timestamp.
   * @param channelId - Channel ID
   * @param updates - Updates to apply
   */
  async updateChannel(channelId: string, updates: Partial<Channel>): Promise<void> {
    const channelDoc = this.getChannelDocRef(channelId);
    await updateDoc(channelDoc, { ...updates, updatedAt: new Date() });
  }

  /**
   * Delete channel from Firestore
   * @description Removes the channel document; subcollection cleanup (messages, threads) is handled by a Cloud Function.
   * @param channelId - Channel ID
   */
  async deleteChannel(channelId: string): Promise<void> {
    const channelDoc = this.getChannelDocRef(channelId);
    await deleteDoc(channelDoc);
  }

  /**
   * Remove user from channel members
   * @description Uses Firestore arrayRemove for an atomic member removal without reading the full document first.
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
