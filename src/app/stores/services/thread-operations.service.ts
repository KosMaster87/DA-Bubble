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
   * @description Centralises path construction for both channel and DM thread sub-collections so all callers use the same string template.
   */
  getThreadsPath = (channelId: string, messageId: string, isDirectMessage?: boolean): string => {
    return isDirectMessage
      ? `direct-messages/${channelId}/messages/${messageId}/threads`
      : `channels/${channelId}/messages/${messageId}/threads`;
  };

  /**
   * Map Firestore document to ThreadMessage
   * @description Converts raw Firestore DocumentData to a typed ThreadMessage, providing safe defaults for optional fields.
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
   * @description Builds the canonical Firestore write payload for a thread reply so serverTimestamp fields are set consistently.
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
   * @description Persists a new thread reply and atomically increments the parent message's thread count via updateParentMessageCount.
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
   * @description Keeps parent message metadata in sync after each reply so the thread-count badge and last-reply indicator update in real time.
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
   * @description Handles partial content edits by merging caller-supplied updates with a mandatory updatedAt and isEdited flag.
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
   * @description Removes the thread document and recalculates parent message metadata to reflect the correct remaining thread count.
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
   * @description Re-queries remaining threads after deletion to set an accurate count and the correct lastThreadTimestamp on the parent.
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
   * @description Resets threadCount and lastThreadTimestamp on the parent when its last thread reply is deleted.
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
