import { Component, HostListener, computed, inject } from '@angular/core';
import { NotificationService } from '@core/services/notification/notification.service';

@Component({
  selector: 'app-notification-container',
  templateUrl: './notification-container.component.html',
  styleUrl: './notification-container.component.scss',
})
export class NotificationContainerComponent {
  private readonly notificationService = inject(NotificationService);

  protected readonly visibleToasts = computed(() => this.notificationService.getVisible(3));

  protected dismiss(toastId: string): void {
    this.notificationService.remove(toastId);
  }

  /**
   * Dismiss the last visible toast when Escape key is pressed.
   */
  @HostListener('document:keydown', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      const toasts = this.visibleToasts();
      if (toasts.length > 0) {
        this.dismiss(toasts[0].id);
      }
    }
  }
}
