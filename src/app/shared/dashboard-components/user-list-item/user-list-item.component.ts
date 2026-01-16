/**
 * @fileoverview User List Item Component
 * @description Reusable component for displaying user/member items with avatar and name
 * @module shared/dashboard-components/user-list-item
 */

import { Component, input, output, inject } from '@angular/core';
import { UserPresenceStore } from '../../../stores';

export interface UserListItem {
  id: string;
  name: string;
  avatar: string;
  status?: string;
}

@Component({
  selector: 'app-user-list-item',
  imports: [],
  templateUrl: './user-list-item.component.html',
  styleUrl: './user-list-item.component.scss',
})
export class UserListItemComponent {
  protected userPresenceStore = inject(UserPresenceStore);

  user = input.required<UserListItem>();
  isActive = input<boolean>(false);
  itemClicked = output<string>();

  /**
   * Handle click event
   */
  protected onClick = (): void => {
    this.itemClicked.emit(this.user().id);
  };

  /**
   * Handle image load error - use fallback avatar
   */
  protected onImageError = (event: Event): void => {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  };
}
