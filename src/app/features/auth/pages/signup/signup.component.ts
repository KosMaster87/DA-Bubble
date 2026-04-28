/**
 * @fileoverview Signup Component
 * @description Component for user registration with form validation
 * @module pages/signup
 */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  getAuthErrorNotificationMessage,
  notificationCopy,
} from '@core/services/notification/notification-copy';
import { NotificationService } from '@core/services/notification/notification.service';
import { slideDownAnimation } from '@shared/animations';
import {
  BackButtonComponent,
  CheckboxFieldComponent,
  InputFieldComponent,
  PrimaryButtonComponent,
} from '@shared/components';
import { AuthStore } from '@stores/auth';

@Component({
  selector: 'app-signup',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputFieldComponent,
    CheckboxFieldComponent,
    PrimaryButtonComponent,
    BackButtonComponent,
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
  animations: [slideDownAnimation],
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  protected signupForm: FormGroup;
  protected isSubmitting = signal(false);

  constructor() {
    this.signupForm = this.createForm();
  }

  /**
   * Create registration form with validation
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   * @function createForm
   * @returns {FormGroup} Form group with validators
   */
  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      privacy: [false, [Validators.requiredTrue]],
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
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.notificationService.warning(notificationCopy.authFormInvalid);
      return;
    }

    await this.performRegistration();
  }

  /**
   * Perform registration with AuthStore
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Routes to verify-email page after successful signup
   * @async
   * @function performRegistration
   * @returns {Promise<void>}
   */
  async performRegistration(): Promise<void> {
    this.isSubmitting.set(true);

    try {
      const { name, email, password } = this.signupForm.value;
      await this.authStore.signup(email, password, name);
      this.notificationService.success(notificationCopy.signupSuccess);
      await this.router.navigate(['/verify-email']);
    } catch (error) {
      console.error('Registration failed:', error);
      this.notificationService.error(
        getAuthErrorNotificationMessage(error, notificationCopy.signupFailed),
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Navigate back to login page
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @function goBack
   * @returns {void}
   */
  goBack(): void {
    this.router.navigate(['/']);
  }
}
