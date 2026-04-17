/**
 * @fileoverview Thread Operations Service
 * @description Firestore operations for thread management
 * @module stores/thread-operations
 */

import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  DocumentReference,
  Firestore,
  getDocs,
  increment,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { type ThreadMessage } from './../threads/thread.store';

type ThreadCreateData = Omit<ThreadMessage, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt: unknown;
  updatedAt: unknown;
};

@Injectable({
  providedIn: 'root',
})
export class ThreadOperationsService {
  private firestore = inject(Firestore);

  /**
   * Get Firestore path for threads collection
   */
  getThreadsPath = (channelId: string, messageId: string, isDirectMessage?: boolean): string => {
    return isDirectMessage
      ? `direct-messages/${channelId}/messages/${messageId}/threads`
      : `channels/${channelId}/messages/${messageId}/threads`;
  };

  /**
   * Map Firestore document to ThreadMessage
   */
  mapThreadDocument = (
    doc: QueryDocumentSnapshot<DocumentData>,
    messageId: string,
  ): ThreadMessage => {
    const data = doc.data();
    return {
      id: doc.id,
      content: data['content'],
      authorId: data['authorId'],
      parentMessageId: messageId,
      channelId: data['channelId'],
      reactions: data['reactions'] || [],
      attachments: data['attachments'] || [],
      isEdited: data['isEdited'] || false,
      createdAt: data['createdAt']?.toDate() || new Date(),
      updatedAt: data['updatedAt']?.toDate() || new Date(),
    } as ThreadMessage;
  };

  /**
   * Create new thread data object
   */
  createThreadData = (
    content: string,
    authorId: string,
    messageId: string,
    channelId: string,
  ): ThreadCreateData => {
    return {
      content,
      authorId,
      parentMessageId: messageId,
      channelId,
      reactions: [],
      attachments: [],
      isEdited: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  };

  /**
   * Add thread reply to Firestore
   */
  addThreadReply = async (
    channelId: string,
    messageId: string,
    content: string,
    authorId: string,
    isDirectMessage?: boolean,
  ): Promise<void> => {
    const threadsPath = this.getThreadsPath(channelId, messageId, isDirectMessage);
    const newThread = this.createThreadData(content, authorId, messageId, channelId);
    await addDoc(collection(this.firestore, threadsPath), newThread);
    await this.updateParentMessageCount(channelId, messageId, isDirectMessage);
  };

  /**
   * Update parent message thread count and timestamp
   */
  updateParentMessageCount = async (
    channelId: string,
    messageId: string,
    isDirectMessage?: boolean,
  ): Promise<void> => {
    const parentPath = isDirectMessage
      ? `direct-messages/${channelId}/messages/${messageId}`
      : `channels/${channelId}/messages/${messageId}`;
    const parentRef = doc(this.firestore, parentPath);
    await updateDoc(parentRef, {
      threadCount: increment(1),
      lastThreadTimestamp: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  /**
   * Update thread in Firestore
   */
  updateThread = async (
    channelId: string,
    messageId: string,
    threadId: string,
    updates: Partial<ThreadMessage>,
    isDirectMessage?: boolean,
  ): Promise<void> => {
    const threadPath = this.getThreadsPath(channelId, messageId, isDirectMessage);
    const threadDoc = doc(this.firestore, threadPath, threadId);
    await updateDoc(threadDoc, {
      ...updates,
      updatedAt: serverTimestamp(),
      isEdited: true,
    });
  };

  /**
   * Delete thread from Firestore
   */
  deleteThread = async (
    channelId: string,
    messageId: string,
    threadId: string,
    isDirectMessage?: boolean,
  ): Promise<void> => {
    const collectionType = isDirectMessage ? 'direct-messages' : 'channels';
    const threadPath = `${collectionType}/${channelId}/messages/${messageId}/threads`;
    await deleteDoc(doc(this.firestore, threadPath, threadId));
    await this.updateParentAfterDelete(collectionType, channelId, messageId, threadPath);
  };

  /**
   * Update parent message metadata after thread deletion
   */
  private updateParentAfterDelete = async (
    collectionType: string,
    channelId: string,
    messageId: string,
    threadPath: string,
  ): Promise<void> => {
    const threadsSnapshot = await getDocs(
      query(collection(this.firestore, threadPath), orderBy('createdAt', 'desc')),
    );
    const parentRef = doc(this.firestore, `${collectionType}/${channelId}/messages/${messageId}`);

    if (threadsSnapshot.size > 0) {
      const latestThreadData = threadsSnapshot.docs[0].data();
      await updateDoc(parentRef, {
        threadCount: threadsSnapshot.size,
        lastThreadTimestamp: latestThreadData['createdAt'],
        updatedAt: serverTimestamp(),
      });
    } else {
      await this.resetParentThreadMetadata(parentRef);
    }
  };

  /**
   * Reset parent message thread metadata to zero
   */
  private resetParentThreadMetadata = async (
    parentRef: DocumentReference<DocumentData>,
  ): Promise<void> => {
    await updateDoc(parentRef, {
      threadCount: 0,
      lastThreadTimestamp: null,
      updatedAt: serverTimestamp(),
    });
  };
}
