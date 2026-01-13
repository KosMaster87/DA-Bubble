/**
 * @fileoverview Back to Workspace Component
 * @description Mobile navigation component to return to workspace sidebar
 * @module shared/components/back-to-workspace
 */

import { Component, output } from '@angular/core';

@Component({
  selector: 'app-back-to-workspace',
  imports: [],
  templateUrl: './back-to-workspace.component.html',
  styleUrl: './back-to-workspace.component.scss',
})
export class BackToWorkspaceComponent {
  backClicked = output<void>();
}
