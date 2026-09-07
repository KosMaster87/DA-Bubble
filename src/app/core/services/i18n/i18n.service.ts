/**
 * @fileoverview I18n Service with Signals
 * @description Type-safe internationalization service using Angular Signals
 * @module I18nService
 */

import { computed, effect, Injectable, signal } from '@angular/core';
import { SupportedLanguage, translations } from './translations';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private currentLangSignal = signal<SupportedLanguage>('de');
  currentLang = computed(() => this.currentLangSignal());
  translations = computed(() => translations[this.currentLangSignal()]);

  constructor() {
    const savedLang = this.loadLanguageFromStorage();
    if (savedLang) {
      this.currentLangSignal.set(savedLang);
    }

    effect(() => {
      this.saveLanguageToStorage(this.currentLangSignal());
    });
  }

  /**
   * Translate a key to current language with optional parameter interpolation
   * @description Resolves a dot-notation key against the active translations map; supports
   *   `{{param}}` placeholder replacement via the optional `params` object.
   * @param key Translation key in dot notation (e.g., 'AUTH.LOGIN')
   * @param params Optional record of placeholder values (e.g., `{ email: 'a@b.com' }`)
   * @returns Translated string with placeholders replaced
   */
  t(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let value: unknown = this.translations();

    for (const k of keys) {
      value = (value as Record<string, unknown> | undefined)?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    let translatedValue = value;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translatedValue = translatedValue.replace(
          new RegExp(`\\{\\{\\s*${paramKey}\\s*\\}\\}`, 'g'),
          paramValue,
        );
      });
    }

    return translatedValue;
  }

  /**
   * Set the current language
   * @description Updates the language signal, which automatically triggers the translations computed and the localStorage-persist effect.
   * @param lang Language code
   */
  setLanguage(lang: SupportedLanguage): void {
    this.currentLangSignal.set(lang);
  }

  /**
   * Toggle to the next supported language.
   * @description Cycles through all supported languages without requiring callers to manage language order.
   */
  toggleLanguage(): void {
    const languages: SupportedLanguage[] = ['de', 'en', 'es', 'ru'];
    const current = this.currentLangSignal();
    const nextIndex = (languages.indexOf(current) + 1) % languages.length;
    this.currentLangSignal.set(languages[nextIndex]);
  }

  /**
   * Load language preference from localStorage
   * @description Reads the persisted language code on startup so the user's choice survives page reloads; swallows storage errors to avoid blocking initialisation.
   */
  private loadLanguageFromStorage(): SupportedLanguage | null {
    try {
      const saved = localStorage.getItem('dabubble_language');
      const validLanguages: SupportedLanguage[] = ['de', 'en', 'es', 'ru'];
      if (saved && validLanguages.includes(saved as SupportedLanguage)) {
        return saved as SupportedLanguage;
      }
    } catch (error) {
      console.warn('Failed to load language from localStorage:', error);
    }
    return null;
  }

  /**
   * Save language preference to localStorage
   * @description Persists the active language code so it can be restored on the next page load; swallows storage errors (e.g. private browsing) gracefully.
   */
  private saveLanguageToStorage(lang: SupportedLanguage): void {
    try {
      localStorage.setItem('dabubble_language', lang);
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error);
    }
  }
}
