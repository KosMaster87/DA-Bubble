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
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  protected signinForm: FormGroup;
  protected isSubmitting = signal(false);
  protected hidePassword = signal(true);

  constructor() {
    this.signinForm = this.createForm();
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
      await this.navigateToHome();
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
      await this.navigateToHome();
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
      await this.navigateToHome();
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
}
