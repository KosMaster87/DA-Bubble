import { Injectable, computed, signal } from '@angular/core';
import { CreateNotificationInput, NotificationToast } from './notification.types';

/**
 * Global session feedback service for toast notifications.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private static readonly DEFAULT_DURATION_BY_TYPE_MS = {
    success: 2600,
    info: 3800,
    warning: 5200,
    error: 6500,
  } as const;

  private readonly _toasts = signal<NotificationToast[]>([]);
  private readonly timerByToastId = new Map<string, ReturnType<typeof setTimeout>>();

  readonly toasts = this._toasts.asReadonly();
  readonly hasToasts = computed(() => this._toasts().length > 0);

  /**
   * Create and enqueue a new toast notification.
   * Prevents duplicate messages of the same type from being added.
   * @description Deduplication guards against rapid repeated calls (e.g. from error retries) showing the same message multiple times.
   */
  show(input: CreateNotificationInput): string {
    // Check for existing duplicate (same type and message)
    const existing = this._toasts().find(
      (t) => t.type === input.type && t.message === input.message,
    );
    if (existing) {
      return existing.id;
    }

    const toast: NotificationToast = {
      id: this.createToastId(),
      type: input.type,
      message: input.message,
      duration: input.duration ?? NotificationService.DEFAULT_DURATION_BY_TYPE_MS[input.type],
      createdAt: Date.now(),
    };

    this._toasts.update((current) => [toast, ...current]);
    this.startDismissTimer(toast);
    return toast.id;
  }

  /**
   * Add a success toast.
   * @description Convenience wrapper setting the 'success' type so callers don't need to pass a type literal.
   */
  success(message: string, duration?: number): string {
    return this.show({ type: 'success', message, duration });
  }

  /**
   * Add an error toast.
   * @description Convenience wrapper setting the 'error' type with a longer default duration to ensure users have time to read error messages.
   */
  error(message: string, duration?: number): string {
    return this.show({ type: 'error', message, duration });
  }

  /**
   * Add an informational toast.
   * @description Convenience wrapper setting the 'info' type for general informational feedback.
   */
  info(message: string, duration?: number): string {
    return this.show({ type: 'info', message, duration });
  }

  /**
   * Add a warning toast.
   * @description Convenience wrapper setting the 'warning' type with the longest default duration so actionable warnings remain visible.
   */
  warning(message: string, duration?: number): string {
    return this.show({ type: 'warning', message, duration });
  }

  /**
   * Remove one toast by id.
   * @description Cancels the dismiss timer before removing to prevent the timer callback from trying to remove an already-deleted toast.
   */
  remove(toastId: string): void {
    this.clearDismissTimer(toastId);
    this._toasts.update((current) => current.filter((toast) => toast.id !== toastId));
  }

  /**
   * Remove all toasts and timers.
   * @description Clears both the signal and the timer map so no orphaned timeouts fire after the list is emptied.
   */
  clear(): void {
    for (const timer of this.timerByToastId.values()) {
      clearTimeout(timer);
    }
    this.timerByToastId.clear();
    this._toasts.set([]);
  }

  /**
   * Return currently visible toasts with a maximum limit.
   * @description Caps the visible count so the notification area doesn't overflow when many errors fire in quick succession.
   */
  getVisible(limit = 3): NotificationToast[] {
    return this._toasts().slice(0, limit);
  }

  /**
   * Start auto-dismiss timer for a toast.
   * @description Registers timed removal only for finite-duration toasts so persistent notifications remain user-controlled.
   * @param {NotificationToast} toast - Toast to schedule for dismissal
   * @returns {void}
   */
  private startDismissTimer(toast: NotificationToast): void {
    if (toast.duration <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      this.remove(toast.id);
    }, toast.duration);

    this.timerByToastId.set(toast.id, timer);
  }

  /**
   * Clear existing auto-dismiss timer for a toast.
   * @description Cancels and removes timer entries to prevent stale callbacks after manual toast removal.
   * @param {string} toastId - Toast identifier
   * @returns {void}
   */
  private clearDismissTimer(toastId: string): void {
    const timer = this.timerByToastId.get(toastId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.timerByToastId.delete(toastId);
  }

  /**
   * Create a unique toast identifier.
   * @description Combines timestamp and random suffix to reduce collision risk when multiple toasts are created in the same millisecond.
   * @returns {string} Unique toast ID
   */
  private createToastId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
