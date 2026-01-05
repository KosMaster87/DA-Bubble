/**
 * @fileoverview Invitation Model for DABubble Application
 * @description Defines invitation types and structures for channel/DM invitations
 * @module core/models/invitation
 */

/**
 * Invitation type definition
 */
export type InvitationType = 'channel' | 'direct-message';

/**
 * Invitation status
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/**
 * Invitation interface
 * Stored in Firestore collection: invitations
 */
export interface Invitation {
  /** Firestore document ID */
  id: string;

  /** Type of invitation */
  type: InvitationType;

  /** User ID of the person who sent the invitation */
  senderId: string;

  /** User ID of the person who receives the invitation */
  recipientId: string;

  /** Channel ID (if type === 'channel') */
  channelId?: string;

  /** Channel name (for display purposes) */
  channelName?: string;

  /** Optional custom message from sender */
  message?: string;

  /** Current status of the invitation */
  status: InvitationStatus;

  /** When the invitation was created */
  createdAt: Date;

  /** When the invitation was last updated */
  updatedAt: Date;

  /** When the invitation expires (optional, e.g., 7 days) */
  expiresAt?: Date;

  /** When the invitation was accepted/declined */
  respondedAt?: Date;
}

/**
 * Request interface for creating an invitation
 */
export interface CreateInvitationRequest {
  type: InvitationType;
  senderId: string;
  recipientId: string;
  channelId?: string;
  channelName?: string;
  message?: string;
  expiresInDays?: number; // Optional: auto-expire after X days (default: 7)
}

/**
 * Response interface for invitation actions
 */
export interface InvitationResponse {
  invitationId: string;
  action: 'accepted' | 'declined';
  respondedAt: Date;
}
