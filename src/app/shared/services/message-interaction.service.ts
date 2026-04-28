/**
 * @fileoverview Message Interaction Service
 * @description Centralizes local message-interaction UI state so edit/delete/reaction affordances stay predictable across conversation views.
 * @module shared/services
 */

import { Injectable, signal } from '@angular/core';

export interface MessageInteractionState {
  editingMessageId: string | null;
  deleteConfirmationMessageId: string | null;
}

/**
 * Service for managing message interaction state
 * @description Tracks edit and delete-confirmation targets for message rows so interaction UI remains consistent.
 */
@Injectable()
export class MessageInteractionService {
  private editingMessageId = signal<string | null>(null);
  private deleteConfirmationMessageId = signal<string | null>(null);

  /**
   * Get editing message ID signal
   * @description Exposes the current edit target as a readonly signal so templates can react without mutating service state.
   */
  getEditingMessageId() {
    return this.editingMessageId.asReadonly();
  }

  /**
   * Get delete confirmation message ID signal
   * @description Exposes the pending delete target as readonly state for confirmation dialogs and action buttons.
   */
  getDeleteConfirmationMessageId() {
    return this.deleteConfirmationMessageId.asReadonly();
  }

  /**
   * Start editing a message
   * @description Marks a message as the active edit target so inline editors can enter edit mode for exactly one message.
   */
  startEdit(messageId: string): void {
    this.editingMessageId.set(messageId);
  }

  /**
   * Cancel editing
   * @description Clears edit mode without persisting changes, returning the UI to read-only message rendering.
   */
  cancelEdit(): void {
    this.editingMessageId.set(null);
  }

  /**
   * Complete editing
   * @description Finalizes local edit state after save so no message remains marked as editable.
   */
  completeEdit(): void {
    this.editingMessageId.set(null);
  }

  /**
   * Check if message is being edited
   * @description Resolves whether the provided message ID matches the active edit target for conditional template rendering.
   */
  isEditing(messageId: string): boolean {
    return this.editingMessageId() === messageId;
  }

  /**
   * Show delete confirmation
   * @description Sets the pending delete target so the UI can display a confirmation state for the selected message.
   */
  showDeleteConfirmation(messageId: string): void {
    this.deleteConfirmationMessageId.set(messageId);
  }

  /**
   * Cancel delete confirmation
   * @description Resets delete-confirmation state when the user aborts the destructive action.
   */
  cancelDelete(): void {
    this.deleteConfirmationMessageId.set(null);
  }

  /**
   * Get message ID for deletion
   * @description Returns the currently selected deletion target so action handlers can execute delete calls against the correct message.
   */
  getDeleteMessageId(): string | null {
    return this.deleteConfirmationMessageId();
  }

  /**
   * Complete deletion
   * @description Clears the pending delete target after successful deletion to close confirmation UI and prevent stale references.
   */
  completeDeletion(): void {
    this.deleteConfirmationMessageId.set(null);
  }
}
