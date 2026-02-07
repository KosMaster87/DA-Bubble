/**
 * @fileoverview Theme Toggle Component
 * @description Standalone component for switching between device/light/dark themes
 * @module shared/components/theme-toggle
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, type Theme } from '@core/services/theme';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);

  // Reactive signal from theme service
  currentTheme = this.themeService.currentTheme;

  private readonly themeOptions: ThemeOption[] = [
    {
      value: 'device',
      label: 'System',
      icon: '/img/theme/device.svg',
    },
    {
      value: 'light',
      label: 'Bright',
      icon: '/img/theme/light-mode.svg',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: '/img/theme/dark-mode.svg',
    },
  ];

  /**
   * Toggle to next theme
   */
  async toggleTheme(): Promise<void> {
    await this.themeService.toggleTheme();
  }

  /**
   * Get current theme icon path
   */
  getCurrentThemeIcon(): string {
    const option = this.themeOptions.find((opt) => opt.value === this.currentTheme());
    return option?.icon || this.themeOptions[0].icon;
  }

  /**
   * Get current theme label
   */
  getCurrentThemeLabel(): string {
    const option = this.themeOptions.find((opt) => opt.value === this.currentTheme());
    return option?.label || this.themeOptions[0].label;
  }

  /**
   * Get next theme label for accessibility
   */
  getNextThemeLabel(): string {
    const nextTheme = this.themeService.getNextTheme(this.currentTheme());
    const option = this.themeOptions.find((opt) => opt.value === nextTheme);
    return option?.label || '';
  }
}
