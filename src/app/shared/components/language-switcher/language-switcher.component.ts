/**
 * @fileoverview Language Switcher Component
 * @description Component for switching between languages
 * @module shared/components/language-switcher
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@core/services/i18n';

@Component({
  selector: 'app-language-switcher',
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  i18n = inject(I18nService);
}
