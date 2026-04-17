import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { NotificationService } from '@core/services/notification/notification.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-notification-container',
  templateUrl: './notification-container.component.html',
  styleUrl: './notification-container.component.scss',
})
export class NotificationContainerComponent {
  private static readonly AUTH_ROUTE_PREFIXES = ['/', '/signup', '/forgot-password'];

  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly currentUrl = signal(this.router.url);

  protected readonly visibleToasts = computed(() => this.notificationService.getVisible(3));
  protected readonly isAuthRoute = computed(() =>
    NotificationContainerComponent.AUTH_ROUTE_PREFIXES.some((prefix) => {
      const url = this.currentUrl();
      return prefix === '/' ? url === '/' : url.startsWith(prefix);
    }),
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

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
