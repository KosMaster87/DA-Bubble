import { Component, computed, inject } from '@angular/core';
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
}
