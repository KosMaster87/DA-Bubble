/**
 * @fileoverview Popup Signup Component
 * @description Displays signup call-to-action for users without an account
 * @module PopupSignupComponent
 */

import { Component } from '@angular/core';
import { LinkButtonComponent } from '@shared/components';
import { ThemeToggleComponent } from '@shared/components/theme-toggle';

@Component({
  selector: 'app-popup-signup',
  imports: [LinkButtonComponent, ThemeToggleComponent],
  templateUrl: './popup-signup.component.html',
  styleUrl: './popup-signup.component.scss',
})
export class PopupSignupComponent {}
