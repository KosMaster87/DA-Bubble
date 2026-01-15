/**
 * Cloud Functions for DABubble
 *
 * This file serves as the main entry point for all Cloud Functions.
 * Individual functions are organized in separate modules for better
 * maintainability.
 *
 * @see /src/scheduled - Scheduled functions (cron jobs)
 * @see /src/firestore - Firestore trigger functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Global settings for all functions
// maxInstances: 10 prevents unexpected scaling costs
setGlobalOptions({maxInstances: 10});

// ============================================
// SCHEDULED FUNCTIONS
// ============================================
export {detectOfflineUsers} from "./scheduled/detectOfflineUsers";
export {cleanupExpiredGuests} from "./scheduled/cleanupExpiredGuests";

// ============================================
// FIRESTORE TRIGGER FUNCTIONS - CHANNELS
// ============================================
export {
  updateChannelOnNewMessage,
  updateChannelOnThreadMessage,
} from "./firestore/channels";

// ============================================
// FIRESTORE TRIGGER FUNCTIONS - DIRECT MESSAGES
// ============================================
export {
  updateDMOnNewMessage,
  updateDirectMessageOnThreadMessage,
} from "./firestore/directMessages";
