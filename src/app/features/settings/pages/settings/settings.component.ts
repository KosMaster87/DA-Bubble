/**
 * @fileoverview Settings Component
 * @description Settings page for user preferences like theme selection (Dashboard view)
 * @module SettingsComponent
 */

import { Component, inject, output, input } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeToggleComponent } from '@shared/components/theme-toggle';
import { LanguageSwitcherComponent } from '@shared/components/language-switcher';
import { TranslatePipe } from '@core/services/i18n/translate.pipe';
import { AuthStore } from '@stores/auth';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ThemeToggleComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private router = inject(Router);
  private authStore = inject(AuthStore);

  isMobileView = input<boolean>(false); // Input from parent to know if mobile
  backRequested = output<void>(); // For mobile back navigation

  protected isAdmin = this.authStore.isAdmin;

  constructor() {
    console.log('SettingsComponent constructed');
  }

  /**
   * Navigate to the admin panel.
   * @description Only rendered when isAdmin() is true; adminGuard is the real
   * enforcement point, this is just the UI entry.
   */
  goToAdminPanel(): void {
    this.router.navigate(['/dashboard/admin']);
  }

  /**
   * Navigate back to dashboard or sidebar (on mobile)
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  goBack(): void {
    if (this.isMobileView()) {
      this.backRequested.emit();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
