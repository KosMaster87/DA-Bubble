/**
 * @fileoverview Legal Overview Component
 * @description Overview page with links to legal documents and information
 * @module LegalOverviewComponent
 */

import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@stores/auth';

interface LegalLink {
  title: string;
  description: string;
  icon: string;
  route: string;
  external?: boolean;
}

@Component({
  selector: 'app-legal-overview',
  imports: [],
  templateUrl: './legal-overview.component.html',
  styleUrl: './legal-overview.component.scss',
})
export class LegalOverviewComponent {
  private router = inject(Router);
  private authStore = inject(AuthStore);

  backRequested = output<void>(); // For mobile back navigation

  protected legalLinks: LegalLink[] = [
    {
      title: 'Imprint',
      description: 'Legal notice and company information',
      icon: '/img/icon/channel-bar/legal.svg',
      route: '/imprint',
    },
    {
      title: 'Privacy Policy',
      description: 'How we handle and protect your data',
      icon: '/img/icon/profile/account-circle-default.svg',
      route: '/privacy-policy',
    },
    {
      title: 'Sources',
      description: 'Image and resource attributions',
      icon: '/img/icon/profile/edit-default.svg',
      route: '/dashboard/legal/sources',
    },
    {
      title: 'Contact',
      description: 'Get in touch with us',
      icon: '/img/icon/profile/msg-default.svg',
      route: 'mailto:support@dabubble.com',
      external: true,
    },
  ];

  /**
   * Navigate to legal document or external link
   */
  navigateTo(link: LegalLink): void {
    if (link.external) {
      window.location.href = link.route;
    } else {
      this.router.navigate([link.route]);
    }
  }

  /**
   * Navigate back to dashboard
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
