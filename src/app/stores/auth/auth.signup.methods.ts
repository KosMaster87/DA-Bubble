/**
 * @fileoverview Authentication Signup Methods
 * @description Methods for user registration and email verification
 * @module AuthSignupMethods
 */

import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
  applyActionCode,
  sendEmailVerification,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
} from '@angular/fire/firestore';
import { patchState } from '@ngrx/signals';
import { User } from '@core/models/user.model';

/**
 * Create signup methods for auth store
 * @function createSignupMethods
 * @param {Auth} auth - Firebase Auth instance
 * @param {Firestore} firestore - Firestore instance
 * @param {any} store - NgRx Signal Store instance
 * @param {Function} handleSuccessfulAuth - Success handler
 * @param {Function} handleAuthError - Error handler
 * @returns {object} Signup methods
 */
export const createSignupMethods = (
  auth: Auth,
  firestore: Firestore,
  store: any,
  handleSuccessfulAuth: (user: any) => void,
  handleAuthError: (error: unknown, message: string) => void
) => ({
  /**
   * Signup new user with email and password
   * Sends verification email but does NOT auto-login
   * @async
   * @param {string} email - User email address
   * @param {string} password - User password
   * @param {string} displayName - User display name
   */
  async signup(email: string, password: string, displayName: string): Promise<void> {
    patchState(store, { isLoading: true, error: null });
    try {
      console.log('🚀 Starting signup process for:', email);

      // Create Firebase Auth user
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase Auth user created:', credential.user.uid);

      await updateProfile(credential.user, { displayName });
      console.log('✅ User profile updated with displayName:', displayName);

      // Create Firestore user document (without photoURL initially)
      const userDoc: Omit<User, 'photoURL'> & { photoURL?: string } = {
        uid: credential.user.uid,
        email: credential.user.email || email,
        displayName: displayName,
        isOnline: false,
        lastSeen: new Date(),
        channels: [],
        directMessages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        scrollState: {}, // Initialize empty scroll state for auto-scroll tracking
      };

      // Only add photoURL if it exists (Firestore doesn't accept undefined)
      if (credential.user.photoURL) {
        userDoc.photoURL = credential.user.photoURL;
      }

      console.log('📝 Attempting to create Firestore user document:', userDoc);
      console.log('🔑 User UID:', credential.user.uid);
      console.log('📊 User data:', JSON.stringify(userDoc, null, 2));

      await setDoc(doc(firestore, 'users', credential.user.uid), userDoc);
      console.log('✅ Firestore user document created successfully!');

      // Add user to DABubble-Welcome channel (create if not exists)
      try {
        const welcomeChannelQuery = query(
          collection(firestore, 'channels'),
          where('name', '==', 'DABubble-welcome')
        );
        const welcomeSnapshot = await getDocs(welcomeChannelQuery);

        if (!welcomeSnapshot.empty) {
          // DABubble-Welcome exists - add user as member
          const welcomeChannel = welcomeSnapshot.docs[0];
          const channelRef = doc(firestore, 'channels', welcomeChannel.id);
          await updateDoc(channelRef, {
            members: arrayUnion(credential.user.uid),
            updatedAt: new Date(),
          });
          console.log('✅ User added to DABubble-Welcome channel');
        } else {
          // DABubble-Welcome doesn't exist - create it with this user as creator
          const welcomeChannelData = {
            name: 'DABubble-welcome',
            description: 'Welcome to DABubble! General announcements and introductions.',
            isPrivate: false,
            createdBy: credential.user.uid,
            members: [credential.user.uid],
            admins: [credential.user.uid],
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessageAt: new Date(),
            messageCount: 0,
          };
          await setDoc(doc(collection(firestore, 'channels')), welcomeChannelData);
          console.log('✅ DABubble-Welcome channel created with first user as admin');
        }
      } catch (channelError) {
        console.warn('⚠️ Could not add user to DABubble-Welcome channel:', channelError);
        // Don't fail signup if channel addition fails
      }

      // Send verification email
      console.log('📧 Attempting to send verification email to:', email);
      console.log('📝 User emailVerified status:', credential.user.emailVerified);

      try {
        await sendEmailVerification(credential.user);
        console.log('✅ Verification email successfully sent to:', email);
        console.log('📨 Please check your inbox and spam folder');
      } catch (emailError: any) {
        console.error('❌ Failed to send verification email:', emailError);
        console.error('🐞 Email error code:', emailError?.code);
        console.error('🐞 Email error message:', emailError?.message);
        // Don't fail the whole signup if email sending fails
      }

      patchState(store, { isLoading: false });
      console.log('✅ Signup process completed successfully!');
    } catch (error) {
      console.error('❌ Signup failed with error:', error);
      handleAuthError(error, 'Registration failed');
    }
  },

  /**
   * Verify email with code
   * @async
   * @param {string} code - Verification code from email
   */
  async verifyEmail(code: string): Promise<void> {
    await applyActionCode(auth, code);
  },

  /**
   * Update user profile and sync with store
   * @async
   * @param {Object} profile - Profile data to update
   */
  async updateUserProfile(profile: { displayName?: string; photoURL?: string }): Promise<void> {
    patchState(store, { isLoading: true });
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      // Update Firebase Auth profile
      await updateProfile(currentUser, profile);

      // Update Firestore user document
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await setDoc(
        userDocRef,
        {
          ...profile,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log('🖼️ Avatar updated in Firestore:', profile.photoURL);

      // Immediately read back the updated user data from Firestore
      const updatedUserDoc = await getDoc(userDocRef);
      if (updatedUserDoc.exists()) {
        const firestoreData = updatedUserDoc.data();
        const user: User = {
          uid: firestoreData['uid'],
          email: firestoreData['email'],
          displayName: firestoreData['displayName'],
          photoURL: firestoreData['photoURL'],
          isOnline: firestoreData['isOnline'],
          lastSeen: firestoreData['lastSeen']?.toDate() || new Date(),
          channels: firestoreData['channels'] || [],
          directMessages: firestoreData['directMessages'] || [],
          createdAt: firestoreData['createdAt']?.toDate() || new Date(),
          updatedAt: firestoreData['updatedAt']?.toDate() || new Date(),
        };

        // Update store with fresh Firestore data
        patchState(store, {
          user,
          isLoading: false,
          error: null,
        });

        console.log('✅ User state updated with avatar:', user.photoURL);
      } else {
        // Fallback to handleSuccessfulAuth if Firestore read fails
        await handleSuccessfulAuth(currentUser);
      }
    } catch (error) {
      handleAuthError(error, 'Profile update failed');
    }
  },
});
