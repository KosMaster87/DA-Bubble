/**
 * @fileoverview Reaction Service
 * @description Shared logic for handling message reactions across different message types
 * @module ReactionService
 */

import { inject, Injectable } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc, DocumentReference } from '@angular/fire/firestore';
import { MessageReaction } from '@core/models/message.model';

@Injectable({
  providedIn: 'root',
})
export class ReactionService {
  private firestore = inject(Firestore);

  /**
   * Toggle a reaction on any message document
   * @param messageRef - Firestore document reference to the message
   * @param emojiId - Emoji ID
   * @param userId - User ID who reacted
   * @throws Error if message not found
   */
  async toggleReaction(
    messageRef: DocumentReference,
    emojiId: string,
    userId: string
  ): Promise<void> {
    try {
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageSnap.data();
      const reactions: MessageReaction[] = messageData['reactions'] || [];

      // Find existing reaction with this emoji
      const existingReaction = reactions.find((r) => r.emoji === emojiId);

      if (existingReaction) {
        // User already reacted with this emoji -> toggle (remove/add user)
        if (existingReaction.users.includes(userId)) {
          const updatedUsers = existingReaction.users.filter((id) => id !== userId);

          if (updatedUsers.length === 0) {
            // Remove reaction completely if no users left
            const updatedReactions = reactions.filter((r) => r.emoji !== emojiId);
            await updateDoc(messageRef, { reactions: updatedReactions });
          } else {
            // Update reaction with removed user
            const updatedReactions = reactions.map((r) =>
              r.emoji === emojiId
                ? { emoji: emojiId, users: updatedUsers, count: updatedUsers.length }
                : r
            );
            await updateDoc(messageRef, { reactions: updatedReactions });
          }
        } else {
          // Add user to existing reaction
          const updatedUsers = [...existingReaction.users, userId];
          const updatedReactions = reactions.map((r) =>
            r.emoji === emojiId
              ? { emoji: emojiId, users: updatedUsers, count: updatedUsers.length }
              : r
          );
          await updateDoc(messageRef, { reactions: updatedReactions });
        }
      } else {
        // Create new reaction
        const newReaction: MessageReaction = {
          emoji: emojiId,
          users: [userId],
          count: 1,
        };
        await updateDoc(messageRef, { reactions: [...reactions, newReaction] });
      }
    } catch (error) {
      console.error('❌ Error toggling reaction:', error);
      throw error;
    }
  }

  /**
   * Helper to create a document reference
   * @param pathSegments - Path segments to the document
   * @returns Firestore document reference
   */
  getMessageRef(...pathSegments: string[]): DocumentReference {
    const [first, ...rest] = pathSegments;
    return doc(this.firestore, first, ...rest);
  }
}
