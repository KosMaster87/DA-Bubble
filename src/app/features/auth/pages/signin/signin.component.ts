/**
 * @fileoverview Signin Component
 * @description Component for user authentication with email/password and Google login
 * @module features/auth/pages/signin
 */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  getAuthErrorNotificationMessage,
  notificationCopy,
} from '@core/services/notification/notification-copy';
import { NotificationService } from '@core/services/notification/notification.service';
import { slideDownAnimation } from '@shared/animations';
import {
  GuestButtonComponent,
  InputFieldComponent,
  PrimaryButtonComponent,
} from '@shared/components';
import { AuthStore } from '@stores/auth';

@Component({
  selector: 'app-signin',
  imports: [ReactiveFormsModule, InputFieldComponent, PrimaryButtonComponent, GuestButtonComponent],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.scss',
  animations: [slideDownAnimation],
})
export class SigninComponent {
  private static readonly SUCCESS_REDIRECT_DELAY_MS = 220;
  private static readonly LOGOUT_STATE_KEY = 'signedOut';

  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  protected signinForm: FormGroup;
  protected isSubmitting = signal(false);
  protected hidePassword = signal(true);

  constructor() {
    this.signinForm = this.createForm();
    this.showSignedOutToastIfNeeded();
  }

  /**
   * Create signin form with validation
   * @function createForm
   * @returns {FormGroup} Form group with validators
   */
  createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  /**
   * Handle form submission with email/password
   * @async
   * @function onSubmit
   * @returns {Promise<void>}
   */
  async onSubmit(): Promise<void> {
    if (this.signinForm.invalid) {
      this.signinForm.markAllAsTouched();
      this.notificationService.warning(notificationCopy.authFormInvalid);
      return;
    }

    await this.performEmailLogin();
  }

  /**
   * Perform email/password login
   * @async
   * @function performEmailLogin
   * @returns {Promise<void>}
   */
  async performEmailLogin(): Promise<void> {
    this.isSubmitting.set(true);

    try {
      const { email, password } = this.signinForm.value;
      await this.authStore.loginWithEmail(email, password);
      await this.notifySuccessAndNavigate(notificationCopy.signinSuccessEmail);
    } catch (error) {
      this.handleLoginError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Handle Google login
   * @async
   * @function onGoogleLogin
   * @returns {Promise<void>}
   */
  async onGoogleLogin(): Promise<void> {
    this.isSubmitting.set(true);

    try {
      await this.authStore.loginWithGoogle();
      await this.notifySuccessAndNavigate(notificationCopy.signinSuccessGoogle);
    } catch (error) {
      this.handleLoginError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Handle guest login (anonymous)
   * @async
   * @function onGuestLogin
   * @returns {Promise<void>}
   */
  async onGuestLogin(): Promise<void> {
    this.isSubmitting.set(true);

    try {
      await this.authStore.loginAnonymously();
      await this.notifySuccessAndNavigate(notificationCopy.signinSuccessGuest);
    } catch (error) {
      this.handleLoginError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Handle login errors
   * @function handleLoginError
   * @param {any} error - Error object
   * @returns {void}
   */
  handleLoginError(error: any): void {
    console.error('Login failed:', error);
    this.signinForm.setErrors({ loginFailed: true });
    this.notificationService.error(
      getAuthErrorNotificationMessage(error, notificationCopy.signinFailed),
    );
  }

  /**
   * Show a success toast and delay redirect slightly so feedback is visible.
   */
  private async notifySuccessAndNavigate(message: string): Promise<void> {
    this.notificationService.success(message);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, SigninComponent.SUCCESS_REDIRECT_DELAY_MS);
    });
    await this.navigateToHome();
  }

  /**
   * Navigate to home/dashboard page
   * @async
   * @function navigateToHome
   * @returns {Promise<void>}
   */
  async navigateToHome(): Promise<void> {
    await this.router.navigate(['/dashboard']);
  }

  /**
   * Navigate to password forgot page
   * @function navigateToPasswordForgot
   * @returns {void}
   */
  navigateToPasswordForgot(): void {
    this.router.navigate(['/forgot-password']);
  }

  /**
   * Toggle password visibility
   * @function togglePasswordVisibility
   * @returns {void}
   */
  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  /**
   * Shows a post-logout confirmation message exactly once on the sign-in page.
   *
   * Purpose:
   * - Confirm to the user that logout really happened and the session is closed.
   * - Provide a polite transition message after leaving the authenticated area.
   * - Avoid duplicate toasts during refresh/back navigation by clearing the transient state.
   *
   * Why this exists:
   * - Logout intentionally redirects immediately for security and responsiveness.
   * - The sign-in page is therefore the right place to communicate "signed out" feedback.
   * - Navigation state is used as a short-lived signal, not as persistent app state.
   */
  private showSignedOutToastIfNeeded(): void {
    const navigation = this.router.currentNavigation();
    const fromNavigation = navigation?.extras?.state?.[SigninComponent.LOGOUT_STATE_KEY] === true;
    const fromHistory = history.state?.[SigninComponent.LOGOUT_STATE_KEY] === true;

    if (!fromNavigation && !fromHistory) {
      return;
    }

    this.notificationService.info(notificationCopy.signedOutInfo);

    if (fromHistory) {
      const { [SigninComponent.LOGOUT_STATE_KEY]: _, ...rest } = history.state ?? {};
      history.replaceState(rest, document.title);
    }
  }
}
