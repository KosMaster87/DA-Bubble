/**
 * @fileoverview Popup Signup Component
 * @description Displays signup call-to-action for users without an account
 * @module PopupSignupComponent
 */

import { Component } from '@angular/core';
import { LinkButtonComponent } from '@shared/components';
import { ThemeToggleComponent } from '@shared/components/theme-toggle';
import { TranslatePipe } from '@core/services/i18n/translate.pipe';

@Component({
  selector: 'app-popup-signup',
  imports: [LinkButtonComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './popup-signup.component.html',
  styleUrl: './popup-signup.component.scss',
})
export class PopupSignupComponent {}
