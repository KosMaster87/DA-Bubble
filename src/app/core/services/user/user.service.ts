/**
 * @fileoverview User Service for Firestore operations
 * @description Handles all Firestore operations for user data
 * @module core/services/user
 */

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from '@angular/fire/firestore';
import { User } from '@core/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private firestore = inject(Firestore);
  private usersCollection = collection(this.firestore, 'users');

  /**
   * Setup real-time listener for users with limit
   */
  setupUsersListener(
    onSuccess: (users: User[]) => void,
    onError: (error: any) => void
  ): Unsubscribe {
    const q = query(
      this.usersCollection,
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const users = this.mapSnapshot(snapshot);
        onSuccess(users);
      },
      onError
    );
  }

  /**
   * Create or update user document
   */
  async createUser(userData: User): Promise<void> {
    const userDoc = doc(this.usersCollection, userData.uid);
    const userWithTimestamps = this.addTimestamps(userData);
    await updateDoc(userDoc, { ...userWithTimestamps });
  }

  /**
   * Update user data
   */
  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    const userDoc = doc(this.usersCollection, uid);
    const updatesWithTimestamp = { ...updates, updatedAt: new Date() };
    await updateDoc(userDoc, updatesWithTimestamp);
  }

  /**
   * Delete user document
   */
  async deleteUser(uid: string): Promise<void> {
    const userDoc = doc(this.usersCollection, uid);
    await deleteDoc(userDoc);
  }

  /**
   * Get user by ID from Firestore
   */
  async getUserById(uid: string): Promise<User | null> {
    const userDoc = doc(this.usersCollection, uid);
    const snapshot = await getDoc(userDoc);
    return snapshot.exists() ? ({ uid, ...snapshot.data() } as User) : null;
  }

  /**
   * Map Firestore snapshot to User array
   */
  private mapSnapshot(snapshot: any): User[] {
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const photoURL = this.normalizePhotoURL(data.photoURL);

      return {
        uid: doc.id,
        ...data,
        photoURL,
      } as User;
    });
  }

  /**
   * Normalize Google profile photo URL
   */
  private normalizePhotoURL(photoURL: string | null | undefined): string | undefined {
    if (!photoURL) return undefined;

    if (photoURL.includes('googleusercontent.com')) {
      const baseUrl = photoURL.split('=')[0].split('?')[0];
      return `${baseUrl}=s96-c`;
    }

    return photoURL;
  }

  /**
   * Add timestamps to user data
   */
  private addTimestamps(userData: User): User {
    const now = new Date();
    return {
      ...userData,
      createdAt: userData.createdAt || now,
      updatedAt: now,
    };
  }
}
