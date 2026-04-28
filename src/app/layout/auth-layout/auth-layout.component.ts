/**
 * @fileoverview Auth Layout Component
 * @description Provides a shared shell for authentication routes so branding, navigation affordances, and legal links stay consistent.
 * @module AuthLayoutComponent
 */

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from '@layout/footer/footer.component';
import { HeaderComponent } from '@layout/header/header.component';

/**
 * Auth Layout Component
 * @class AuthLayoutComponent
 * @description Composes header, routed auth content, and footer in one layout to prevent per-page structural duplication.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {}
