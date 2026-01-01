/**
 * @fileoverview Channel Model Definitions for DABubble
 * @description TypeScript interfaces for Channel data structures
 * @module ChannelModel
 */

export interface Channel {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: string; // User UID
  members: string[]; // User UIDs
  admins: string[]; // User UIDs with admin rights
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
}

export interface CreateChannelRequest {
  name: string;
  description: string;
  isPrivate: boolean;
  members: string[]; // User UIDs
}

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  members?: string[];
  admins?: string[];
}

export interface ChannelMember {
  uid: string;
  joinedAt: Date;
  role: 'owner' | 'admin' | 'member';
}
