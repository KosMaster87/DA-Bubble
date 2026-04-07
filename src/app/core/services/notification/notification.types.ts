/**
 * Notification severity type.
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Immutable UI notification entity.
 */
export interface NotificationToast {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
  createdAt: number;
}

/**
 * Input used to create a new notification.
 */
export interface CreateNotificationInput {
  type: NotificationType;
  message: string;
  duration?: number;
}
