/**
 * @fileoverview Members Miniatures Component
 * @description Displays stacked member avatars with counter
 * @module shared/dashboard-components/members-miniatures
 */

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MemberMiniature {
  id: string;
  name: string;
  avatar: string;
}

@Component({
  selector: 'app-members-miniatures',
  imports: [CommonModule],
  templateUrl: './members-miniatures.component.html',
  styleUrl: './members-miniatures.component.scss',
})
export class MembersMiniatureComponent {
  members = input<MemberMiniature[]>([]);
  totalCount = input<number>(0);
  memberClicked = output<void>();

  /**
   * Handle click event
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onClick(): void {
    this.memberClicked.emit();
  }

  /**
   * Handle image load error - use fallback avatar
   * @description Defines a single hydration path so startup and reload behavior remain predictable across navigation scenarios.
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  }
}
