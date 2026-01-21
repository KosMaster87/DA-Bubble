/**
 * @fileoverview Invitation Service for DABubble Application
 * @description Service for managing channel and DM invitations
 * @module core/services/invitation
 */

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
} from '@angular/fire/firestore';
import {
  Invitation,
  InvitationStatus,
  CreateInvitationRequest,
  InvitationResponse,
} from '../../models/invitation.model';

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  private firestore = inject(Firestore);
  private readonly COLLECTION_NAME = 'invitations';

  /**
   * Convert Firestore document to Invitation
   * @private
   * @param {QueryDocumentSnapshot<DocumentData>} doc - Firestore document
   * @returns {Invitation} Converted invitation object
   */
  private convertToInvitation = (doc: QueryDocumentSnapshot<DocumentData>): Invitation => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data['type'],
      senderId: data['senderId'],
      recipientId: data['recipientId'],
      channelId: data['channelId'],
      channelName: data['channelName'],
      message: data['message'],
      status: data['status'],
      createdAt: data['createdAt']?.toDate() || new Date(),
      updatedAt: data['updatedAt']?.toDate() || new Date(),
      expiresAt: data['expiresAt']?.toDate(),
      respondedAt: data['respondedAt']?.toDate(),
    };
  };

  /**
   * Build invitation data object
   * @private
   * @param {CreateInvitationRequest} request - Request data
   * @returns {any} Invitation data for Firestore
   */
  private buildInvitationData = (request: CreateInvitationRequest): any => {
    const now = Timestamp.now();
    const expiresAt = this.calculateExpirationDate(request.expiresInDays || 7);
    const data: any = {
      type: request.type,
      senderId: request.senderId,
      recipientId: request.recipientId,
      status: 'pending' as InvitationStatus,
      createdAt: now,
      updatedAt: now,
      expiresAt: Timestamp.fromDate(expiresAt),
    };
    return this.addOptionalFields(data, request);
  };

  /**
   * Calculate expiration date
   * @private
   * @param {number} expiresInDays - Days until expiration
   * @returns {Date} Expiration date
   */
  private calculateExpirationDate = (expiresInDays: number): Date => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    return expiresAt;
  };

  /**
   * Add optional fields to invitation data
   * @private
   * @param {any} data - Base invitation data
   * @param {CreateInvitationRequest} request - Request with optional fields
   * @returns {any} Data with optional fields added
   */
  private addOptionalFields = (data: any, request: CreateInvitationRequest): any => {
    if (request.channelId) data.channelId = request.channelId;
    if (request.channelName) data.channelName = request.channelName;
    if (request.message) data.message = request.message;
    return data;
  };

  /**
   * Create new invitation
   * @param {CreateInvitationRequest} request - Invitation request data
   * @returns {Promise<string>} Created invitation ID
   */
  createInvitation = async (request: CreateInvitationRequest): Promise<string> => {
    try {
      const invitationData = this.buildInvitationData(request);
      const docRef = await addDoc(collection(this.firestore, this.COLLECTION_NAME), invitationData);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Accept invitation
   * @param {string} invitationId - Invitation ID
   * @returns {Promise<InvitationResponse>} Response with timestamp
   */
  acceptInvitation = async (invitationId: string): Promise<InvitationResponse> => {
    try {
      const invitationRef = doc(this.firestore, this.COLLECTION_NAME, invitationId);
      const respondedAt = Timestamp.now();
      await updateDoc(invitationRef, {
        status: 'accepted' as InvitationStatus,
        respondedAt,
        updatedAt: respondedAt,
      });
      return { invitationId, action: 'accepted', respondedAt: respondedAt.toDate() };
    } catch (error) {
      throw error;
    }
  };

  /**
   * Decline invitation
   * @param {string} invitationId - Invitation ID
   * @returns {Promise<InvitationResponse>} Response with timestamp
   */
  declineInvitation = async (invitationId: string): Promise<InvitationResponse> => {
    try {
      const invitationRef = doc(this.firestore, this.COLLECTION_NAME, invitationId);
      const respondedAt = Timestamp.now();
      await updateDoc(invitationRef, {
        status: 'declined' as InvitationStatus,
        respondedAt,
        updatedAt: respondedAt,
      });
      return { invitationId, action: 'declined', respondedAt: respondedAt.toDate() };
    } catch (error) {
      throw error;
    }
  };

  /**
   * Delete invitation
   * @param {string} invitationId - Invitation ID
   * @returns {Promise<void>}
   */
  deleteInvitation = async (invitationId: string): Promise<void> => {
    try {
      const invitationRef = doc(this.firestore, this.COLLECTION_NAME, invitationId);
      await deleteDoc(invitationRef);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get invitations for user as recipient
   * @param {string} userId - User ID
   * @returns {Promise<Invitation[]>} User invitations
   */
  getInvitationsForUser = async (userId: string): Promise<Invitation[]> => {
    try {
      const q = query(
        collection(this.firestore, this.COLLECTION_NAME),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => this.convertToInvitation(doc));
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get pending invitations for user
   * @param {string} userId - User ID
   * @returns {Promise<Invitation[]>} Pending invitations
   */
  getPendingInvitations = async (userId: string): Promise<Invitation[]> => {
    try {
      const q = query(
        collection(this.firestore, this.COLLECTION_NAME),
        where('recipientId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => this.convertToInvitation(doc));
    } catch (error) {
      throw error;
    }
  };

  /**
   * Handle subscription error
   * @private
   * @param {any} error - Error object
   * @param {string} type - Subscription type
   */
  private handleSubscriptionError = (error: any, type: string): void => {
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) return;
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.error('Firebase index required - click link in error above to create it');
    }
  };

  /**
   * Subscribe to invitations for user
   * @param {string} userId - User ID
   * @param {Function} callback - Callback with invitations
   * @returns {Function} Unsubscribe function
   */
  subscribeToInvitations = (
    userId: string,
    callback: (invitations: Invitation[]) => void
  ): (() => void) => {
    const q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const invitations = snapshot.docs.map((doc) => this.convertToInvitation(doc));
        callback(invitations);
      },
      (error: any) => this.handleSubscriptionError(error, 'invitations')
    );
  };

  /**
   * Subscribe to pending invitations only
   * @param {string} userId - User ID
   * @param {Function} callback - Callback with pending invitations
   * @returns {Function} Unsubscribe function
   */
  subscribeToPendingInvitations = (
    userId: string,
    callback: (invitations: Invitation[]) => void
  ): (() => void) => {
    const q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('recipientId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const invitations = snapshot.docs.map((doc) => this.convertToInvitation(doc));
        callback(invitations);
      },
      (error: any) => this.handleSubscriptionError(error, 'pending invitations')
    );
  };

  /**
   * Mark expired invitations as expired
   * @returns {Promise<number>} Number of expired invitations
   */
  expireOldInvitations = async (): Promise<number> => {
    try {
      const now = Timestamp.now();
      const q = query(
        collection(this.firestore, this.COLLECTION_NAME),
        where('status', '==', 'pending'),
        where('expiresAt', '<=', now)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(this.firestore);
      snapshot.docs.forEach((document) => {
        batch.update(document.ref, { status: 'expired' as InvitationStatus, updatedAt: now });
      });
      await batch.commit();
      return snapshot.size;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Check if user has pending channel invitation
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID
   * @returns {Promise<boolean>} True if pending invitation exists
   */
  hasPendingChannelInvitation = async (userId: string, channelId: string): Promise<boolean> => {
    try {
      const q = query(
        collection(this.firestore, this.COLLECTION_NAME),
        where('recipientId', '==', userId),
        where('channelId', '==', channelId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  };
}
