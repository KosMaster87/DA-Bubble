import { Injectable, computed, inject, signal } from '@angular/core';
import { I18nService } from '@core/services/i18n/i18n.service';
import { CreateNotificationInput, NotificationToast } from './notification.types';

/**
 * Global session feedback service for toast notifications.
 * Supports both raw strings (backward compatible) and i18n translation keys.
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
  private i18nService = inject(I18nService);

  readonly toasts = this._toasts.asReadonly();
  readonly hasToasts = computed(() => this._toasts().length > 0);

  /**
   * Resolve a string — if it looks like a translation key (contains '.'), translate it;
   * otherwise return it as-is.
   */
  private resolveMessage(message: string): string {
    return message.includes('.') ? this.i18nService.t(message) : message;
  }

  /**
   * Create and enqueue a new toast notification.
   * Accepts raw strings or translation keys (dot-notation).
   * Prevents duplicate messages of the same type from being added.
   */
  show(input: CreateNotificationInput): string {
    const resolvedMessage = this.resolveMessage(input.message);

    // Check for existing duplicate (same type and resolved message)
    const existing = this._toasts().find(
      (t) => t.type === input.type && t.message === resolvedMessage,
    );
    if (existing) {
      return existing.id;
    }

    const toast: NotificationToast = {
      id: this.createToastId(),
      type: input.type,
      message: resolvedMessage,
      duration: input.duration ?? NotificationService.DEFAULT_DURATION_BY_TYPE_MS[input.type],
      createdAt: Date.now(),
    };

    this._toasts.update((current) => [toast, ...current]);
    this.startDismissTimer(toast);
    return toast.id;
  }

  /**
   * Notify with a translation key or raw string by type.
   * @param message Translation key (e.g. 'NOTIFICATIONS.SIGNIN_SUCCESS_EMAIL') or raw string
   * @param type Toast severity
   * @param duration Optional override duration in ms
   */
  notify(message: string, type: NotificationToast['type'], duration?: number): string {
    return this.show({ type, message, duration });
  }

  /**
   * Add a success toast by key or raw string.
   */
  success(message: string, duration?: number): string {
    return this.show({ type: 'success', message, duration });
  }

  /**
   * Add an error toast by key or raw string.
   */
  error(message: string, duration?: number): string {
    return this.show({ type: 'error', message, duration });
  }

  /**
   * Add an informational toast by key or raw string.
   */
  info(message: string, duration?: number): string {
    return this.show({ type: 'info', message, duration });
  }

  /**
   * Add a warning toast by key or raw string.
   */
  warning(message: string, duration?: number): string {
    return this.show({ type: 'warning', message, duration });
  }

  /**
   * Remove one toast by id.
   */
  remove(toastId: string): void {
    this.clearDismissTimer(toastId);
    this._toasts.update((current) => current.filter((toast) => toast.id !== toastId));
  }

  /**
   * Remove all toasts and timers.
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
   */
  getVisible(limit = 3): NotificationToast[] {
    return this._toasts().slice(0, limit);
  }

  /**
   * Start auto-dismiss timer for a toast.
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
   */
  private createToastId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
