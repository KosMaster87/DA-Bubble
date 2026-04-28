/**
 * @fileoverview Password Forgot Component
 * @description Component for password reset request
 * @module features/auth/pages/password-forgot
 */

import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '@stores/auth';
import {
  InputFieldComponent,
  PrimaryButtonComponent,
  BackButtonComponent,
} from '@shared/components';

@Component({
  selector: 'app-password-forgot',
  imports: [ReactiveFormsModule, InputFieldComponent, PrimaryButtonComponent, BackButtonComponent],
  templateUrl: './password-forgot.component.html',
  styleUrl: './password-forgot.component.scss',
})
export class PasswordForgotComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authStore = inject(AuthStore);

  protected forgotForm: FormGroup;
  protected isSubmitting = signal(false);
  protected emailSent = signal(false);

  constructor() {
    this.forgotForm = this.createForm();
  }

  /**
   * Create forgot password form
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   * @function createForm
   * @returns {FormGroup} Form group
   */
  createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  /**
   * Handle form submission
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @async
   * @function onSubmit
   * @returns {Promise<void>}
   */
  async onSubmit(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    await this.sendPasswordReset();
  }

  /**
   * Send password reset email
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @async
   * @function sendPasswordReset
   * @returns {Promise<void>}
   */
  async sendPasswordReset(): Promise<void> {
    this.isSubmitting.set(true);

    try {
      const { email } = this.forgotForm.value;
      await this.authStore.sendPasswordResetEmail(email);
      this.emailSent.set(true);
    } catch (error) {
      console.error('Password reset failed:', error);
      this.forgotForm.setErrors({ resetFailed: true });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Navigate back to signin
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @function goBack
   * @returns {void}
   */
  goBack(): void {
    this.router.navigate(['/']);
  }
}
