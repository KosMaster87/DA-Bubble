/**
 * @fileoverview Admin Service
 * @description Thin wrapper around the setUserRole callable so components never touch
 * Firebase Functions directly.
 * @module core/services/admin
 */

import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

type AssignableRole = 'member' | 'admin';

interface SetUserRoleResult {
  success: boolean;
  unchanged: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private functions = inject(Functions);

  /**
   * Promote or demote a user between 'member' and 'admin'.
   * @description Server-side callable enforces that only the owner may do this — see
   * functions/src/admin/set-user-role.ts. Firestore rules never allow this write directly.
   * @param targetUid - UID of the user whose role changes
   * @param role - The role to set
   */
  async setUserRole(targetUid: string, role: AssignableRole): Promise<SetUserRoleResult> {
    const callable = httpsCallable<{ targetUid: string; role: AssignableRole }, SetUserRoleResult>(
      this.functions,
      'setUserRole',
    );
    const result = await callable({ targetUid, role });
    return result.data;
  }
}
