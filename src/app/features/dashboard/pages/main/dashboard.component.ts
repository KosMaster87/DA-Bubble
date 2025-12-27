/**
 * @fileoverview Dashboard Component
 * @description Main dashboard view after authentication
 * @module features/dashboard/pages/main
 */

import { Component, inject, signal } from '@angular/core';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { ChannelsSidebarComponent } from '../../components/channels-sidebar/channels-sidebar.component';
import { ChannalWelcomeComponent } from '../../components/channal-welcome/channal-welcome.component';
import { ChatMailboxComponent } from '../../components/chat-mailbox/chat-mailbox.component';
import { ChatNewMsgComponent } from '../../components/chat-new-msg/chat-new-msg.component';
import { WorkspaceMenuToggleComponent } from '@shared/dashboard-components';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';

type DashboardView = 'welcome' | 'chat-new-msg' | 'mailbox';

@Component({
  selector: 'app-dashboard',
  imports: [
    DashboardHeaderComponent,
    ChannelsSidebarComponent,
    ChannalWelcomeComponent,
    ChatMailboxComponent,
    ChatNewMsgComponent,
    WorkspaceMenuToggleComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected sidebarService = inject(WorkspaceSidebarService);
  protected currentView = signal<DashboardView>('welcome');

  /**
   * Switch to new message view
   */
  showNewMessage(): void {
    this.currentView.set('chat-new-msg');
  }

  /**
   * Switch to welcome view
   */
  showWelcome(): void {
    this.currentView.set('welcome');
  }

  /**
   * Switch to mailbox view
   */
  showMailbox(): void {
    this.currentView.set('mailbox');
  }
}
