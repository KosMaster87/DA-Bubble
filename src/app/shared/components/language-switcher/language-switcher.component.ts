/**
 * @fileoverview Language Switcher Component
 * @description Component for switching between 4 languages: DE, EN, ES, RU
 * @module shared/components/language-switcher
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@core/services/i18n';
import { SupportedLanguage } from '@core/services/i18n/translations';

interface LanguageOption {
  code: 'de' | 'en' | 'es' | 'ru';
  label: string;
  flag: string;
}

@Component({
  selector: 'app-language-switcher',
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  i18n = inject(I18nService);

  languages: LanguageOption[] = [
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  ];

  setLanguage(lang: SupportedLanguage): void {
    this.i18n.setLanguage(lang);
  }
}
