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
   * Translate a key to current language
   * @description Resolves a dot-notation key against the active translations map; logs a warning and returns the raw key if not found, so missing keys are visible during development.
   * @param key Translation key in dot notation (e.g., 'AUTH.LOGIN')
   * @returns Translated string
   */
  t(key: string): string {
    const keys = key.split('.');
    let value: any = this.translations();

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return value;
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
   * Toggle between German and English
   * @description Cycles between the two supported languages without requiring the caller to know which is currently active.
   */
  toggleLanguage(): void {
    const current = this.currentLangSignal();
    this.currentLangSignal.set(current === 'de' ? 'en' : 'de');
  }

  /**
   * Load language preference from localStorage
   * @description Reads the persisted language code on startup so the user’s choice survives page reloads; swallows storage errors to avoid blocking initialisation.
   */
  private loadLanguageFromStorage(): SupportedLanguage | null {
    try {
      const saved = localStorage.getItem('dabubble_language');
      if (saved && (saved === 'de' || saved === 'en')) {
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
