/**
 * @fileoverview Verify Email Component
 * @description Component for email verification after registration
 * @module features/auth/pages/verify-email
 */

import { Component, effect, inject, signal } from '@angular/core';
import { Auth, sendEmailVerification } from '@angular/fire/auth';
import { Router } from '@angular/router';
import {
  getAuthErrorNotificationMessage,
  notificationCopy,
} from '@core/services/notification/notification-copy';
import { NotificationService } from '@core/services/notification/notification.service';
import {
  GuestButtonComponent,
  PrimaryButtonComponent,
  SecondaryButtonComponent,
} from '@shared/components';

@Component({
  selector: 'app-verify-email',
  imports: [PrimaryButtonComponent, SecondaryButtonComponent, GuestButtonComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent {
  private router = inject(Router);
  private auth = inject(Auth);
  private notificationService = inject(NotificationService);

  protected userEmail = signal<string>('');
  protected isChecking = signal(false);
  protected emailSent = signal(false);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser;
      if (user) {
        this.userEmail.set(user.email || '');
      }
    });
  }

  /**
   * Check if email is verified and navigate to avatar selection
   * @async
   * @function checkVerification
   * @returns {Promise<void>}
   */
  async checkVerification(): Promise<void> {
    this.isChecking.set(true);

    try {
      await this.auth.currentUser?.reload();
      const isVerified = this.auth.currentUser?.emailVerified;

      if (isVerified) {
        await this.router.navigate(['/avatar-selection']);
      } else {
        this.notificationService.info(notificationCopy.verifyEmailPending);
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      this.notificationService.error(
        getAuthErrorNotificationMessage(error, notificationCopy.verifyEmailCheckFailed),
      );
    } finally {
      this.isChecking.set(false);
    }
  }

  /**
   * Resend verification email
   * @async
   * @function resendVerificationEmail
   * @returns {Promise<void>}
   */
  async resendVerificationEmail(): Promise<void> {
    try {
      if (this.auth.currentUser) {
        await sendEmailVerification(this.auth.currentUser);
        this.emailSent.set(true);
        this.notificationService.success(notificationCopy.verifyEmailResent);
        setTimeout(() => this.emailSent.set(false), 3000);
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      this.notificationService.error(
        getAuthErrorNotificationMessage(error, notificationCopy.verifyEmailResendFailed),
      );
    }
  }

  /**
   * Logout and navigate back to signin
   * @async
   * @function goToSignin
   * @returns {Promise<void>}
   */
  async goToSignin(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/'], { state: { signedOut: true } });
  }
}
