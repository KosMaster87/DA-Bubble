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
  InvitationType,
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
   */
  private convertToInvitation(doc: QueryDocumentSnapshot<DocumentData>): Invitation {
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
  }

  /**
   * Create a new invitation
   */
  async createInvitation(request: CreateInvitationRequest): Promise<string> {
    try {
      const now = Timestamp.now();
      const expiresInDays = request.expiresInDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Build invitation data - only include fields that have values
      const invitationData: {
        type: InvitationType;
        senderId: string;
        recipientId: string;
        status: InvitationStatus;
        createdAt: Timestamp;
        updatedAt: Timestamp;
        expiresAt: Timestamp;
        channelId?: string;
        channelName?: string;
        message?: string;
      } = {
        type: request.type,
        senderId: request.senderId,
        recipientId: request.recipientId,
        status: 'pending' as InvitationStatus,
        createdAt: now,
        updatedAt: now,
        expiresAt: Timestamp.fromDate(expiresAt),
      };

      // Only add optional fields if they have actual values (not null/undefined)
      if (request.channelId) {
        invitationData.channelId = request.channelId;
      }
      if (request.channelName) {
        invitationData.channelName = request.channelName;
      }
      if (request.message) {
        invitationData.message = request.message;
      }

      const docRef = await addDoc(collection(this.firestore, this.COLLECTION_NAME), invitationData);

      console.log('✉️ Invitation created:', {
        invitationId: docRef.id,
        type: request.type,
        recipientId: request.recipientId,
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating invitation:', error);
      throw error;
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitationId: string): Promise<InvitationResponse> {
    try {
      const invitationRef = doc(this.firestore, this.COLLECTION_NAME, invitationId);
      const respondedAt = Timestamp.now();

      await updateDoc(invitationRef, {
        status: 'accepted' as InvitationStatus,
        respondedAt,
        updatedAt: respondedAt,
      });

      console.log('✅ Invitation accepted:', invitationId);

      return {
        invitationId,
        action: 'accepted',
        respondedAt: respondedAt.toDate(),
      };
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: string): Promise<InvitationResponse> {
    try {
      const invitationRef = doc(this.firestore, this.COLLECTION_NAME, invitationId);
      const respondedAt = Timestamp.now();

      await updateDoc(invitationRef, {
        status: 'declined' as InvitationStatus,
        respondedAt,
        updatedAt: respondedAt,
      });

      console.log('❌ Invitation declined:', invitationId);

      return {
        invitationId,
        action: 'declined',
        respondedAt: respondedAt.toDate(),
      };
    } catch (error) {
      console.error('❌ Error declining invitation:', error);
      throw error;
    }
  }

  /**
   * Delete an invitation
   */
  async deleteInvitation(invitationId: string): Promise<void> {
    try {
      const invitationRef = doc(this.firestore, this.COLLECTION_NAME, invitationId);
      await deleteDoc(invitationRef);

      console.log('🗑️ Invitation deleted:', invitationId);
    } catch (error) {
      console.error('❌ Error deleting invitation:', error);
      throw error;
    }
  }

  /**
   * Get invitations for a specific user (as recipient)
   */
  async getInvitationsForUser(userId: string): Promise<Invitation[]> {
    try {
      const q = query(
        collection(this.firestore, this.COLLECTION_NAME),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const invitations = snapshot.docs.map((doc) => this.convertToInvitation(doc));

      console.log('📬 Loaded invitations for user:', userId, invitations.length);

      return invitations;
    } catch (error) {
      console.error('❌ Error loading invitations:', error);
      throw error;
    }
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId: string): Promise<Invitation[]> {
    try {
      const q = query(
        collection(this.firestore, this.COLLECTION_NAME),
        where('recipientId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const invitations = snapshot.docs.map((doc) => this.convertToInvitation(doc));

      console.log('📬 Loaded pending invitations:', userId, invitations.length);

      return invitations;
    } catch (error) {
      console.error('❌ Error loading pending invitations:', error);
      throw error;
    }
  }

  /**
   * Subscribe to invitations for a user (real-time updates)
   */
  subscribeToInvitations(
    userId: string,
    callback: (invitations: Invitation[]) => void
  ): () => void {
    const q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const invitations = snapshot.docs.map((doc) => this.convertToInvitation(doc));
        callback(invitations);
        console.log('📬 Invitations updated:', userId, invitations.length);
      },
      (error: any) => {
        // Auto-cleanup on permission error (user logged out)
        if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
          console.log('🔓 Permission error detected - stopping invitations subscription');
          return;
        }

        console.error('❌ Error in invitations subscription:', error);

        // Special handling for missing index error
        if (error.code === 'failed-precondition' && error.message?.includes('index')) {
          console.error('');
          console.error('═══════════════════════════════════════════════════════════');
          console.error('❌ FIREBASE INDEX ERFORDERLICH');
          console.error('═══════════════════════════════════════════════════════════');
          console.error('');
          console.error('📋 Bitte KLICKE auf den Link im Fehler oben, um den Index');
          console.error('   automatisch zu erstellen (nur 1 Klick erforderlich).');
          console.error('');
          console.error('🎯 Dies ist ein einmaliger Setup-Schritt.');
          console.error('   Nach der Erstellung funktionieren Invitations automatisch.');
          console.error('');
          console.error('⏱️  Index-Erstellung dauert ca. 1-2 Minuten.');
          console.error('');
          console.error('═══════════════════════════════════════════════════════════');
        }
      }
    );

    return unsubscribe;
  }

  /**
   * Subscribe to pending invitations only (real-time)
   */
  subscribeToPendingInvitations(
    userId: string,
    callback: (invitations: Invitation[]) => void
  ): () => void {
    const q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('recipientId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const invitations = snapshot.docs.map((doc) => this.convertToInvitation(doc));
        callback(invitations);
        console.log('📬 Pending invitations updated:', userId, invitations.length);
      },
      (error: any) => {
        // Auto-cleanup on permission error (user logged out)
        if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
          console.log('🔓 Permission error detected - stopping pending invitations subscription');
          return;
        }

        console.error('❌ Error in pending invitations subscription:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Mark expired invitations as expired (cleanup utility)
   */
  async expireOldInvitations(): Promise<number> {
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
        batch.update(document.ref, {
          status: 'expired' as InvitationStatus,
          updatedAt: now,
        });
      });

      await batch.commit();

      console.log('⏰ Expired old invitations:', snapshot.size);

      return snapshot.size;
    } catch (error) {
      console.error('❌ Error expiring invitations:', error);
      throw error;
    }
  }

  /**
   * Check if user has pending invitation for a specific channel
   */
  async hasPendingChannelInvitation(userId: string, channelId: string): Promise<boolean> {
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
      console.error('❌ Error checking pending invitation:', error);
      return false;
    }
  }
}
