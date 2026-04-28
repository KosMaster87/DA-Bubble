/**
 * @fileoverview Password Restore Component
 * @description Component for resetting password with new password
 * @module features/auth/pages/password-restore
 */

import { Component, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '@stores/auth';
import { InputFieldComponent, PrimaryButtonComponent } from '@shared/components';

@Component({
  selector: 'app-password-restore',
  imports: [ReactiveFormsModule, InputFieldComponent, PrimaryButtonComponent],
  templateUrl: './password-restore.component.html',
  styleUrl: './password-restore.component.scss',
})
export class PasswordRestoreComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authStore = inject(AuthStore);

  protected restoreForm: FormGroup;
  protected isSubmitting = signal(false);
  protected hidePassword = signal(true);
  protected hideConfirmPassword = signal(true);
  protected oobCode = signal<string | null>(null);

  protected passwordsMatch = computed(() => {
    const password = this.restoreForm.get('password')?.value;
    const confirm = this.restoreForm.get('confirmPassword')?.value;
    return password === confirm && password !== '';
  });

  constructor() {
    this.restoreForm = this.createForm();
    this.checkOobCode();
  }

  /**
   * Check for oobCode in URL
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @function checkOobCode
   * @returns {void}
   */
  checkOobCode(): void {
    const code = this.route.snapshot.queryParamMap.get('oobCode');
    if (!code) {
      this.router.navigate(['/']);
      return;
    }
    this.oobCode.set(code);
  }

  /**
   * Create restore form
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   * @function createForm
   * @returns {FormGroup} Form group
   */
  createForm(): FormGroup {
    return this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
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
    if (this.restoreForm.invalid || !this.passwordsMatch()) {
      this.restoreForm.markAllAsTouched();
      return;
    }

    await this.resetPassword();
  }

  /**
   * Reset password with new password
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @async
   * @function resetPassword
   * @returns {Promise<void>}
   */
  async resetPassword(): Promise<void> {
    this.isSubmitting.set(true);

    try {
      const code = this.oobCode();
      const { password } = this.restoreForm.value;

      if (!code) return;

      await this.authStore.confirmPasswordReset(code, password);
      await this.navigateToSignin();
    } catch (error) {
      console.error('Password reset failed:', error);
      this.restoreForm.setErrors({ resetFailed: true });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Navigate to signin page
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @async
   * @function navigateToSignin
   * @returns {Promise<void>}
   */
  async navigateToSignin(): Promise<void> {
    await this.router.navigate(['/']);
  }

  /**
   * Toggle password visibility
   * @description Encapsulates UI transition rules so overlay and panel state changes stay predictable across triggers.
   * @function togglePasswordVisibility
   * @returns {void}
   */
  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  /**
   * Toggle confirm password visibility
   * @description Encapsulates UI transition rules so overlay and panel state changes stay predictable across triggers.
   * @function toggleConfirmPasswordVisibility
   * @returns {void}
   */
  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }
}
