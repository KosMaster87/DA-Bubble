/**
 * @fileoverview User Options Menu Mobile Component
 * @description Bottom sheet menu with user options for mobile devices
 * @module shared/dashboard-components/user-options-menu-mobile
 */

import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-user-options-menu-mobile',
  imports: [CommonModule],
  templateUrl: './user-options-menu-mobile.component.html',
  styleUrl: './user-options-menu-mobile.component.scss',
})
export class UserOptionsMenuMobileComponent {
  isVisible = input.required<boolean>();
  profileClicked = output<void>();
  mailboxClicked = output<void>();
  logoutClicked = output<void>();
  closeClicked = output<void>();

  // Touch drag state
  protected isDragging = signal(false);
  protected dragStartY = 0;
  protected currentTranslateY = signal(0);
  protected isClosing = signal(false);

  /**
   * Handle close click (overlay)
   * @description Closes the bottom sheet using the shared animated close path.
   */
  onClose(): void {
    this.triggerClose();
  }

  /**
   * Handle click on drag handle
   * @description Treats a drag-handle tap as explicit dismiss action for quick close behavior.
   */
  onHandleClick(): void {
    this.triggerClose();
  }

  /**
   * Trigger close with animation
   * @description Starts close animation and emits close after animation delay to keep transitions smooth.
   */
  private triggerClose(): void {
    this.isClosing.set(true);
    setTimeout(() => {
      this.closeClicked.emit();
      this.isClosing.set(false);
    }, 300);
  }

  /**
   * Handle touch start on drag handle
   * @description Captures initial touch position and enters drag mode for gesture-based dismissal.
   */
  onTouchStart(event: TouchEvent): void {
    this.isDragging.set(true);
    this.dragStartY = event.touches[0].clientY;
  }

  /**
   * Handle touch move on drag handle
   * @description Updates downward translation while dragging to provide real-time visual feedback.
   */
  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging()) return;

    const currentY = event.touches[0].clientY;
    const deltaY = currentY - this.dragStartY;

    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      this.currentTranslateY.set(deltaY);
    }
  }

  /**
   * Handle touch end on drag handle
   * @description Closes sheet when drag threshold is exceeded, otherwise snaps the panel back to its resting position.
   */
  onTouchEnd(): void {
    if (!this.isDragging()) return;

    const threshold = 100; // Close if dragged more than 100px

    if (this.currentTranslateY() > threshold) {
      // Start closing animation from current position
      this.isDragging.set(false);
      this.isClosing.set(true);

      // Animate to full close
      setTimeout(() => {
        this.closeClicked.emit();
        this.isClosing.set(false);
        this.currentTranslateY.set(0);
      }, 300);
    } else {
      // Snap back to original position
      this.isDragging.set(false);
      this.currentTranslateY.set(0);
    }
  }

  /**
   * Handle profile click
   * @description Closes sheet first, then emits profile action to avoid interaction overlap during transition.
   */
  onProfileClick(): void {
    this.triggerClose();
    setTimeout(() => {
      this.profileClicked.emit();
    }, 100);
  }

  /**
   * Handle mailbox click
   * @description Closes sheet first, then emits mailbox action to keep navigation transitions visually clean.
   */
  onMailboxClick(): void {
    this.triggerClose();
    setTimeout(() => {
      this.mailboxClicked.emit();
    }, 100);
  }

  /**
   * Handle logout click
   * @description Closes sheet first, then emits logout action so auth flow starts after UI dismissal.
   */
  onLogoutClick(): void {
    this.triggerClose();
    setTimeout(() => {
      this.logoutClicked.emit();
    }, 100);
  }
}
