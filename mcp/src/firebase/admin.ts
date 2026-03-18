/**
 * @fileoverview Firebase Admin SDK initialisation
 * @description Initialises the Firebase Admin SDK using Application Default
 *   Credentials (ADC) or a service-account key supplied via the
 *   GOOGLE_APPLICATION_CREDENTIALS environment variable.
 *
 *   Required environment variable:
 *     FIREBASE_PROJECT_ID  – your Firebase project ID
 *
 *   Optional (needed only when ADC is not configured):
 *     GOOGLE_APPLICATION_CREDENTIALS – path to a service-account JSON file
 *
 * @module firebase/admin
 */

import * as admin from 'firebase-admin';

/**
 * Lazily-initialised Firestore instance.
 */
let _db: admin.firestore.Firestore | null = null;

/**
 * Initialise Firebase Admin and return the Firestore instance.
 * Calling this function multiple times is safe (idempotent).
 *
 * @returns {admin.firestore.Firestore} The Firestore instance
 */
export function getFirestore(): admin.firestore.Firestore {
  if (_db) return _db;

  const projectId = process.env['FIREBASE_PROJECT_ID'];
  if (!projectId) {
    throw new Error(
      'Missing required environment variable: FIREBASE_PROJECT_ID',
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId });
  }

  _db = admin.firestore();
  return _db;
}
