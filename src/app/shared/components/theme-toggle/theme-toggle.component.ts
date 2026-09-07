/**
 * @fileoverview Theme Toggle Component
 * @description Standalone component for switching between device/light/dark themes
 *   with a segmented button group UI.
 * @module shared/components/theme-toggle
 */

import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { ThemeService, type Theme } from '@core/services/theme';
import { TranslatePipe } from '@core/services/i18n/translate.pipe';

interface ThemeOption {
  value: Theme;
  labelKey: string;
}

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);

  /**
   * Whether to show as a segmented button group instead of the single toggle icon.
   * 'segment' is better for settings pages; 'icon' works for compact header placement.
   */
  @Input() mode: 'icon' | 'segment' = 'segment';

  currentTheme = this.themeService.currentTheme;

  themeOptions: ThemeOption[] = [
    { value: 'device', labelKey: 'SETTINGS.AUTO' },
    { value: 'light', labelKey: 'SETTINGS.LIGHT' },
    { value: 'dark', labelKey: 'SETTINGS.DARK' },
  ];

  /**
   * Set specific theme
   * @description Applies the named theme via the service. Primarily used by segment mode.
   */
  async setTheme(theme: Theme): Promise<void> {
    await this.themeService.setTheme(theme);
  }

  /**
   * Toggle to next theme (icon mode only)
   * @description Advances to the next configured theme via the service.
   */
  async toggleTheme(): Promise<void> {
    await this.themeService.toggleTheme();
  }
}
