/**
 * @fileoverview Not Found Component
 * @description 404 error page with smart navigation based on auth status
 * @module pages/not-found
 */

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@stores/auth';
import { SecondaryButtonComponent } from '@shared/components';

@Component({
  selector: 'app-not-found',
  imports: [SecondaryButtonComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent {
  private router = inject(Router);
  private authStore = inject(AuthStore);

  /**
   * Navigate back to appropriate page based on authentication status
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @returns {Promise<void>}
   */
  async goBack(): Promise<void> {
    const isAuthenticated = this.authStore.isAuthenticated();
    if (isAuthenticated) {
      await this.router.navigate(['/dashboard']);
    } else {
      await this.router.navigate(['/']);
    }
  }
}
