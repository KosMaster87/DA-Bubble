/**
 * @fileoverview Message Interaction Service
 * @description Handles message interactions like edit, delete, reactions
 * @module shared/services
 */

import { Injectable, signal } from '@angular/core';

export interface MessageInteractionState {
  editingMessageId: string | null;
  deleteConfirmationMessageId: string | null;
}

/**
 * Service for managing message interaction state
 */
@Injectable()
export class MessageInteractionService {
  private editingMessageId = signal<string | null>(null);
  private deleteConfirmationMessageId = signal<string | null>(null);

  /**
   * Get editing message ID signal
   */
  getEditingMessageId() {
    return this.editingMessageId.asReadonly();
  }

  /**
   * Get delete confirmation message ID signal
   */
  getDeleteConfirmationMessageId() {
    return this.deleteConfirmationMessageId.asReadonly();
  }

  /**
   * Start editing a message
   */
  startEdit(messageId: string): void {
    this.editingMessageId.set(messageId);
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.editingMessageId.set(null);
  }

  /**
   * Complete editing
   */
  completeEdit(): void {
    this.editingMessageId.set(null);
  }

  /**
   * Check if message is being edited
   */
  isEditing(messageId: string): boolean {
    return this.editingMessageId() === messageId;
  }

  /**
   * Show delete confirmation
   */
  showDeleteConfirmation(messageId: string): void {
    this.deleteConfirmationMessageId.set(messageId);
  }

  /**
   * Cancel delete confirmation
   */
  cancelDelete(): void {
    this.deleteConfirmationMessageId.set(null);
  }

  /**
   * Get message ID for deletion
   */
  getDeleteMessageId(): string | null {
    return this.deleteConfirmationMessageId();
  }

  /**
   * Complete deletion
   */
  completeDeletion(): void {
    this.deleteConfirmationMessageId.set(null);
  }
}
