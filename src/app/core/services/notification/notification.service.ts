import { Injectable, computed, signal } from '@angular/core';
import { CreateNotificationInput, NotificationToast } from './notification.types';

/**
 * Global session feedback service for toast notifications.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private static readonly DEFAULT_DURATION_MS = 4000;

  private readonly _toasts = signal<NotificationToast[]>([]);
  private readonly timerByToastId = new Map<string, ReturnType<typeof setTimeout>>();

  readonly toasts = this._toasts.asReadonly();
  readonly hasToasts = computed(() => this._toasts().length > 0);

  /**
   * Create and enqueue a new toast notification.
   */
  show(input: CreateNotificationInput): string {
    const toast: NotificationToast = {
      id: this.createToastId(),
      type: input.type,
      message: input.message,
      duration: input.duration ?? NotificationService.DEFAULT_DURATION_MS,
      createdAt: Date.now(),
    };

    this._toasts.update((current) => [toast, ...current]);
    this.startDismissTimer(toast);
    return toast.id;
  }

  /**
   * Add a success toast.
   */
  success(message: string, duration?: number): string {
    return this.show({ type: 'success', message, duration });
  }

  /**
   * Add an error toast.
   */
  error(message: string, duration?: number): string {
    return this.show({ type: 'error', message, duration });
  }

  /**
   * Add an informational toast.
   */
  info(message: string, duration?: number): string {
    return this.show({ type: 'info', message, duration });
  }

  /**
   * Add a warning toast.
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

  private startDismissTimer(toast: NotificationToast): void {
    if (toast.duration <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      this.remove(toast.id);
    }, toast.duration);

    this.timerByToastId.set(toast.id, timer);
  }

  private clearDismissTimer(toastId: string): void {
    const timer = this.timerByToastId.get(toastId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.timerByToastId.delete(toastId);
  }

  private createToastId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
