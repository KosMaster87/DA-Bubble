/**
 * @fileoverview Channel Message Operations Service
 * @description Handles all Firestore CRUD operations for channel messages
 * @module core/services/channel-message-operations
 */

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  CollectionReference,
  DocumentData,
  Timestamp,
  QueryDocumentSnapshot,
} from '@angular/fire/firestore';
import { Message, MessageType } from '@core/models/message.model';
import { MentionParserService } from '../mention-parser/mention-parser.service';

@Injectable({
  providedIn: 'root',
})
export class ChannelMessageOperationsService {
  private firestore = inject(Firestore);
  private mentionParser = inject(MentionParserService);

  /**
   * Get messages collection reference for channel
   * @param channelId - Channel ID
   * @returns Collection reference
   */
  getMessagesCollectionRef = (channelId: string): CollectionReference<DocumentData> => {
    return collection(this.firestore, `channels/${channelId}/messages`);
  };

  /**
   * Get message document reference
   * @param channelId - Channel ID
   * @param messageId - Message ID
   * @returns Document reference path
   */
  getMessageDocRef = (channelId: string, messageId: string) => {
    return doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
  };

  /**
   * Map Firestore document to Message object
   * @param docId - Document ID
   * @param data - Document data
   * @returns Mapped message object
   */
  mapMessageDocument = (docId: string, data: DocumentData): Message => {
    return {
      id: docId,
      ...data,
      createdAt: this.convertTimestamp(data['createdAt']) || new Date(),
      updatedAt: this.convertTimestamp(data['updatedAt']) || new Date(),
      editedAt: this.convertTimestamp(data['editedAt']),
      lastThreadTimestamp: this.convertTimestamp(data['lastThreadTimestamp']),
      reactions: data['reactions'] || [],
      threadCount: data['threadCount'] || 0,
    } as Message;
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
   * Send new message to channel
   * @param channelId - Channel ID
   * @param content - Message content
   * @param authorId - Author user ID
   */
  async sendMessage(channelId: string, content: string, authorId: string): Promise<void> {
    const mentionedUserIds = this.mentionParser.extractMentionedUserIds(content);
    const messagesRef = this.getMessagesCollectionRef(channelId);
    await addDoc(messagesRef, {
      content,
      authorId,
      channelId,
      type: MessageType.TEXT,
      attachments: [],
      reactions: [],
      mentionedUserIds,
      threadCount: 0,
      isEdited: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Update existing message content
   * @param channelId - Channel ID
   * @param messageId - Message ID
   * @param content - New content
   */
  async updateMessage(channelId: string, messageId: string, content: string): Promise<void> {
    const messageRef = this.getMessageDocRef(channelId, messageId);
    await updateDoc(messageRef, {
      content,
      isEdited: true,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete message from channel
   * @param channelId - Channel ID
   * @param messageId - Message ID
   */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await this.deleteMessageDocument(channelId, messageId);
    await this.deleteThreadMessages(channelId, messageId);
  }

  /**
   * Delete message document
   * @param channelId - Channel ID
   * @param messageId - Message ID
   */
  private deleteMessageDocument = async (channelId: string, messageId: string): Promise<void> => {
    const messageRef = this.getMessageDocRef(channelId, messageId);
    await deleteDoc(messageRef);
  };

  /**
   * Delete all thread messages for parent
   * @param channelId - Channel ID
   * @param messageId - Parent message ID
   */
  private deleteThreadMessages = async (channelId: string, messageId: string): Promise<void> => {
    const threadsRef = collection(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threads`
    );
    const threadsSnapshot = await getDocs(threadsRef);
    const deletePromises = threadsSnapshot.docs.map((threadDoc) => deleteDoc(threadDoc.ref));
    await Promise.all(deletePromises);
  };

  /**
   * Load older messages for pagination
   * @param channelId - Channel ID
   * @param lastMessage - Last message snapshot to paginate from
   * @param limitCount - Number of messages to load (default 100)
   * @returns Array of older messages
   */
  async loadOlderMessages(
    channelId: string,
    lastMessage: QueryDocumentSnapshot<DocumentData>,
    limitCount: number = 100
  ): Promise<Message[]> {
    const messagesRef = this.getMessagesCollectionRef(channelId);
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      startAfter(lastMessage),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapMessageDocument(doc.id, doc.data())).reverse();
  }
}
