/**
 * @fileoverview Workspace Sidebar Service
 * @description Centralisiert Sidebar-, Dropdown- und Channel-Creation-UI-Zustand, damit alle Workspace-Bereiche konsistent auf dieselben Signale reagieren.
 * @module shared/services/workspace-sidebar
 */

import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceSidebarService {
  private _isHidden = signal(false);
  readonly isHidden = this._isHidden.asReadonly();
  readonly isVisible = computed(() => !this._isHidden());

  // Dropdown states
  private _isChannelsOpen = signal(true);
  private _isDirectMessagesOpen = signal(true);
  private _isSystemControlOpen = signal(true);

  readonly isChannelsOpen = this._isChannelsOpen.asReadonly();
  readonly isDirectMessagesOpen = this._isDirectMessagesOpen.asReadonly();
  readonly isSystemControlOpen = this._isSystemControlOpen.asReadonly();

  // Channel creation flow states
  private _isAddChannelActive = signal(false);
  private _isCreateChannelOpen = signal(false);
  private _isAddMemberAfterChannelOpen = signal(false);

  readonly isAddChannelActive = this._isAddChannelActive.asReadonly();
  readonly isCreateChannelOpen = this._isCreateChannelOpen.asReadonly();
  readonly isAddMemberAfterChannelOpen = this._isAddMemberAfterChannelOpen.asReadonly();

  // Thread unread popup state
  private _hoveredThreadUnreadId = signal<string | null>(null);
  readonly hoveredThreadUnreadId = this._hoveredThreadUnreadId.asReadonly();

  // Hover timeout management for thread unread popup
  private hoverTimeout: any = null;

  // Pending channel data for creation flow
  private _pendingChannelName = signal<string>('');
  private _pendingChannelDescription = signal<string>('');
  private _pendingChannelIsPrivate = signal<boolean>(false);

  readonly pendingChannelName = this._pendingChannelName.asReadonly();
  readonly pendingChannelDescription = this._pendingChannelDescription.asReadonly();
  readonly pendingChannelIsPrivate = this._pendingChannelIsPrivate.asReadonly();

  /**
   * Toggle sidebar visibility
   * @description Invertiert den Sidebar-Status für schnelle Ein-/Ausblendung ohne zusätzliche View-Logik im Component-Code.
   */
  toggle(): void {
    this._isHidden.update((value) => !value);
  }

  /**
   * Show sidebar
   * @description Erzwingt sichtbare Sidebar als explizite Aktion für Navigationseinstiege.
   */
  show(): void {
    this._isHidden.set(false);
  }

  /**
   * Hide sidebar
   * @description Erzwingt versteckte Sidebar für enge Layouts oder contentfokussierte Ansichten.
   */
  hide(): void {
    this._isHidden.set(true);
  }

  /**
   * Toggle channels dropdown
   * @description Schaltet den Channels-Bereich auf/zu, ohne andere Dropdown-Sektionen zu beeinflussen.
   */
  toggleChannels(): void {
    this._isChannelsOpen.update((value) => !value);
  }

  /**
   * Toggle direct messages dropdown
   * @description Schaltet den Direktnachrichten-Bereich auf/zu, damit Listenplatz gezielt freigegeben werden kann.
   */
  toggleDirectMessages(): void {
    this._isDirectMessagesOpen.update((value) => !value);
  }

  /**
   * Toggle system control dropdown
   * @description Schaltet den System-Control-Bereich auf/zu, um Sidebar-Sektionen unabhängig steuerbar zu halten.
   */
  toggleSystemControl(): void {
    this._isSystemControlOpen.update((value) => !value);
  }

  /**
   * Start add channel flow
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   */
  startAddChannel(): void {
    this._isAddChannelActive.update((v) => !v);
    this._isCreateChannelOpen.set(true);
  }

  /**
   * Open create channel popup
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   */
  openCreateChannel(): void {
    this._isCreateChannelOpen.set(true);
  }

  /**
   * Close create channel popup
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   */
  closeCreateChannel(): void {
    this._isCreateChannelOpen.set(false);
    this._isAddChannelActive.set(false);
  }

  /**
   * Open add member after channel popup
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   */
  openAddMemberAfterChannel(): void {
    this._isAddMemberAfterChannelOpen.set(true);
  }

  /**
   * Close add member after channel popup and clear pending data
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
   */
  closeAddMemberAfterChannel(): void {
    this._isAddMemberAfterChannelOpen.set(false);
    this._isAddChannelActive.set(false);
    this.clearPendingChannelData();
  }

  /**
   * Set pending channel data for creation flow
   * @description Puffert Formulardaten zwischen Creation-Schritten, damit sie beim Wechsel zwischen Dialogen erhalten bleiben.
   */
  setPendingChannelData(name: string, description: string, isPrivate: boolean): void {
    this._pendingChannelName.set(name);
    this._pendingChannelDescription.set(description);
    this._pendingChannelIsPrivate.set(isPrivate);
  }

  /**
   * Clear pending channel data
   * @description Setzt alle temporären Channel-Eingaben zurück, um Folgeerstellungen mit sauberem Startzustand zu beginnen.
   */
  clearPendingChannelData(): void {
    this._pendingChannelName.set('');
    this._pendingChannelDescription.set('');
    this._pendingChannelIsPrivate.set(false);
  }

  /**
   * Set hovered thread unread ID for popup
   * @description Steuert, welcher Thread-Unread-Eintrag aktuell das Hover-Popup anzeigen soll.
   */
  setHoveredThreadUnreadId(id: string | null): void {
    this._hoveredThreadUnreadId.set(id);
  }

  /**
   * Handle mouse enter on thread unread item
   * @description Bricht geplantes Schließen ab und zeigt den aktiven Unread-Eintrag sofort an.
   * Clears any pending timeout and shows popup
   */
  onThreadUnreadMouseEnter(id: string): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this._hoveredThreadUnreadId.set(id);
  }

  /**
   * Handle mouse leave on thread unread item
   * @description Startet ein verzögertes Schließen, damit der Cursor ohne Flackern zum Popup wechseln kann.
   * Adds delay before hiding to allow moving to popup
   */
  onThreadUnreadMouseLeave(): void {
    this.hoverTimeout = setTimeout(() => {
      this._hoveredThreadUnreadId.set(null);
      this.hoverTimeout = null;
    }, 200);
  }

  /**
   * Cancel hover timeout (when entering popup)
   * @description Stoppt das verzögerte Schließen beim Eintritt ins Popup, damit dessen Interaktion stabil bleibt.
   * Prevents popup from hiding when user moves mouse to it
   */
  onPopupMouseEnter(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }
}
