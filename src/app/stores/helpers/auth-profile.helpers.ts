/**
 * @fileoverview Authentication profile helpers
 * @description Pure helper functions for user profile management and updates.
 * @module auth-profile
 */

import { User as FirebaseUser, updateProfile } from '@angular/fire/auth';

/**
 * Update Firebase Auth profile for existing user.
 * @description Reuses Firebase's `updateProfile` API for profile edits to avoid
 * divergence between Auth and Firestore representations of the same user.
 * @param firebaseUser - Firebase Auth user object
 * @param profile - Profile updates to apply (displayName and/or photoURL)
 */
export async function updateExistingUserProfile(
  firebaseUser: FirebaseUser,
  profile: { displayName?: string; photoURL?: string },
): Promise<void> {
  await updateProfile(firebaseUser, profile);
  console.log('✅ User profile updated:', profile);
}
