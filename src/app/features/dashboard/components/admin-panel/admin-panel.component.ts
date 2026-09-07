/**
 * @fileoverview Admin Panel Component
 * @description Owner-only user overview with promote/demote controls. Route access is
 * restricted by adminGuard; the owner-only role-change enforcement itself lives
 * server-side in the setUserRole callable, not here.
 * @module features/dashboard/components/admin-panel
 */

import { Component, inject, output, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@core/services/i18n/translate.pipe';
import { AdminService } from '@core/services/admin/admin.service';
import { AuthStore } from '@stores/auth';
import { UserStore } from '@stores/users/user.store';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent {
  private router = inject(Router);
  private adminService = inject(AdminService);
  private authStore = inject(AuthStore);
  private userStore = inject(UserStore);

  isMobileView = input<boolean>(false);
  backRequested = output<void>();

  protected isOwner = this.authStore.isOwner;
  protected users = this.userStore.users;
  protected pendingUid = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);

  constructor() {
    this.userStore.loadUsers();
  }

  /**
   * Whether the row for this user should show promote/demote controls.
   * @description Only the owner sees controls, and never on their own row or on
   * another owner's row (ownership never changes here).
   */
  canManage(targetUid: string, targetRole: string | undefined): boolean {
    return this.isOwner() && targetRole !== 'owner' && targetUid !== this.authStore.user()?.uid;
  }

  /**
   * Promote a member to admin.
   */
  async promote(targetUid: string): Promise<void> {
    await this.changeRole(targetUid, 'admin');
  }

  /**
   * Demote an admin back to member.
   */
  async demote(targetUid: string): Promise<void> {
    await this.changeRole(targetUid, 'member');
  }

  private async changeRole(targetUid: string, role: 'member' | 'admin'): Promise<void> {
    this.pendingUid.set(targetUid);
    this.errorMessage.set(null);
    try {
      await this.adminService.setUserRole(targetUid, role);
      // Firestore listener in UserStore picks up the change; no local patch needed.
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Role change failed.');
    } finally {
      this.pendingUid.set(null);
    }
  }

  /**
   * Navigate back to dashboard or sidebar (on mobile)
   * @description Mirrors SettingsComponent.goBack for the same shell-navigation pattern.
   */
  goBack(): void {
    if (this.isMobileView()) {
      this.backRequested.emit();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
