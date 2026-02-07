/**
 * @fileoverview Responsive Panel Management Service
 * @description Manages automatic panel visibility at responsive breakpoints
 * @module shared/services
 */

import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ResponsiveViewService } from './responsive-view.service';
import { WorkspaceSidebarService } from './workspace-sidebar.service';
import { DashboardStateService } from './dashboard-state.service';
import { ThreadManagementService } from './thread-management.service';

type ClosedContent = { type: 'channel' | 'dm'; id: string } | null;

/**
 * Service managing responsive panel behavior
 * Handles automatic hiding/showing of panels based on viewport width
 */
@Injectable({ providedIn: 'root' })
export class ResponsivePanelManagementService {
  private router = inject(Router);
  private responsiveView = inject(ResponsiveViewService);
  private sidebarService = inject(WorkspaceSidebarService);
  private dashboardState = inject(DashboardStateService);
  private threadManagement = inject(ThreadManagementService);

  private previousSidebarOpen = signal<boolean>(!this.sidebarService.isHidden());
  private previousHasContent = signal<boolean>(false);
  private closedContentByRule = signal<ClosedContent>(null);

  /**
   * Initialize panel management effects
   * Sets up all three responsive behavior rules
   *
   */
  setupEffects = (): void => {
    this.setupRuleUnder1024px();
    this.setupRuleBetween1024And1280px();
    this.setupRuleRestore();
  };

  /**
   * Rule 1: Under 1024px with thread - save content, CSS hides it
   * Saves content state when viewport is under 1024px with thread open
   *
   */
  private setupRuleUnder1024px = (): void => {
    effect(() => {
      const viewportWidth = this.responsiveView.viewportWidth();
      const isThreadOpen = this.threadManagement.isThreadOpen();
      const currentView = this.dashboardState.currentView();
      const hasContent = this.hasActiveContent(currentView);
      const alreadyClosed = this.closedContentByRule();

      untracked(() => {
        if (this.shouldSaveContentUnder1024px(viewportWidth, hasContent, isThreadOpen, alreadyClosed)) {
          this.saveCurrentContent(currentView);
        }
      });
    });
  };

  /**
   * Rule 2: Between 1024-1280px - sidebar and content mutually exclusive
   * Manages panel exclusivity in mid-range viewport widths
   *
   */
  private setupRuleBetween1024And1280px = (): void => {
    effect(() => {
      const viewportWidth = this.responsiveView.viewportWidth();
      const isThreadOpen = this.threadManagement.isThreadOpen();
      const isSidebarOpen = !this.sidebarService.isHidden();
      const currentView = this.dashboardState.currentView();
      const hasContent = this.hasActiveContent(currentView);

      untracked(() => {
        if (this.isInMidRange(viewportWidth, isThreadOpen)) {
          this.handleMidRangePanel(isSidebarOpen, hasContent, currentView);
          this.updatePreviousStates(isSidebarOpen, hasContent);
        }
      });
    });
  };

  /**
   * Rule 3: Restore content when conditions met
   * Restores previously closed content when viewport is wide enough
   *
   */
  private setupRuleRestore = (): void => {
    effect(() => {
      const viewportWidth = this.responsiveView.viewportWidth();
      const isThreadOpen = this.threadManagement.isThreadOpen();
      const closedContent = this.closedContentByRule();
      const currentView = this.dashboardState.currentView();

      untracked(() => {
        if (this.shouldRestoreContent(closedContent, viewportWidth, isThreadOpen, currentView)) {
          this.restoreContent(closedContent!);
        }
      });
    });
  };

  /**
   * Check if view has active content
   * @param view - Current view name
   * @returns True if view is channel or direct message
   *
   */
  private hasActiveContent = (view: string): boolean => {
    return view === 'channel' || view === 'direct-message';
  };

  /**
   * Check if should save content under 1024px
   * @param width - Viewport width
   * @param hasContent - Whether content is active
   * @param threadOpen - Whether thread is open
   * @param alreadyClosed - Already closed content state
   * @returns True if should save content
   *
   */
  private shouldSaveContentUnder1024px = (
    width: number,
    hasContent: boolean,
    threadOpen: boolean,
    alreadyClosed: ClosedContent,
  ): boolean => {
    return (
      width < 1024 &&
      hasContent &&
      threadOpen &&
      !this.responsiveView.isMobile() &&
      !alreadyClosed
    );
  };

  /**
   * Check if viewport is in mid range
   * @param width - Viewport width
   * @param threadOpen - Whether thread is open
   * @returns True if in 1024-1280px range
   *
   */
  private isInMidRange = (width: number, threadOpen: boolean): boolean => {
    return width >= 1024 && width < 1280 && threadOpen && !this.responsiveView.isMobile();
  };

  /**
   * Save current content state
   * @param currentView - Current view name
   *
   */
  private saveCurrentContent = (currentView: string): void => {
    const selectedChannel = this.dashboardState.selectedChannel();
    const selectedDM = this.dashboardState.selectedDM();

    if (currentView === 'channel' && selectedChannel) {
      this.closedContentByRule.set({ type: 'channel', id: selectedChannel.id });
    } else if (currentView === 'direct-message' && selectedDM) {
      this.closedContentByRule.set({ type: 'dm', id: selectedDM.conversationId });
    }
  };

  /**
   * Handle mid-range panel behavior
   * @param isSidebarOpen - Whether sidebar is open
   * @param hasContent - Whether content is active
   * @param currentView - Current view name
   *
   */
  private handleMidRangePanel = (
    isSidebarOpen: boolean,
    hasContent: boolean,
    currentView: string,
  ): void => {
    const wasSidebarOpen = this.previousSidebarOpen();
    const hadContent = this.previousHasContent();
    const alreadyClosed = this.closedContentByRule();

    const sidebarJustOpened = !wasSidebarOpen && isSidebarOpen;
    const contentJustOpened = !hadContent && hasContent;

    if (sidebarJustOpened && hasContent && !alreadyClosed) {
      this.saveCurrentContent(currentView);
    } else if (contentJustOpened && isSidebarOpen) {
      this.sidebarService.hide();
      this.previousSidebarOpen.set(false);
    }
  };

  /**
   * Update previous state tracking
   * @param isSidebarOpen - Whether sidebar is open
   * @param hasContent - Whether content is active
   *
   */
  private updatePreviousStates = (isSidebarOpen: boolean, hasContent: boolean): void => {
    this.previousSidebarOpen.set(isSidebarOpen);
    this.previousHasContent.set(hasContent);
  };

  /**
   * Check if should restore content
   * @param closedContent - Closed content state
   * @param width - Viewport width
   * @param threadOpen - Whether thread is open
   * @param currentView - Current view name
   * @returns True if should restore content
   *
   */
  private shouldRestoreContent = (
    closedContent: ClosedContent,
    width: number,
    threadOpen: boolean,
    currentView: string,
  ): boolean => {
    if (!closedContent) return false;

    const shouldRestore = width >= 1280 || !threadOpen;
    const isShowingSameContent = this.isShowingClosedContent(closedContent, currentView);

    return shouldRestore && !isShowingSameContent;
  };

  /**
   * Check if currently showing the closed content
   * @param closedContent - Closed content state
   * @param currentView - Current view name
   * @returns True if showing the same content
   *
   */
  private isShowingClosedContent = (closedContent: ClosedContent, currentView: string): boolean => {
    if (!closedContent) return false;

    const selectedChannel = this.dashboardState.selectedChannel();
    const selectedDM = this.dashboardState.selectedDM();

    return (
      (closedContent.type === 'channel' &&
        currentView === 'channel' &&
        selectedChannel?.id === closedContent.id) ||
      (closedContent.type === 'dm' &&
        currentView === 'direct-message' &&
        selectedDM?.conversationId === closedContent.id)
    );
  };

  /**
   * Restore previously closed content
   * @param closedContent - Closed content state to restore
   *
   */
  private restoreContent = (closedContent: ClosedContent): void => {
    if (!closedContent) return;

    if (closedContent.type === 'channel') {
      this.router.navigate(['/dashboard', 'channel', closedContent.id]);
    } else {
      this.router.navigate(['/dashboard', 'dm', closedContent.id]);
    }

    this.closedContentByRule.set(null);
  };
}
