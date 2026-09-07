/**
 * @fileoverview Translate Pipe for I18n
 * @description Template pipe that resolves translation keys via I18nService while staying reactive to language changes.
 * @module services/i18n/translate.pipe
 */

import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false, // Re-evaluate when language changes
})
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  /**
   * Transform a translation key to translated text with optional parameter interpolation
   * @description Keeps templates free of imperative i18n calls while always resolving keys against the currently active language.
   * @param key Translation key (e.g., 'AUTH.LOGIN')
   * @param params Optional record of placeholder values for `{{param}}` interpolation
   * @returns Translated string
   *
   * @example
   * {{ 'AUTH.LOGIN' | t }}
   * {{ 'AUTH.VERIFY_EMAIL_SUBTITLE' | t: { email: userEmail() } }}
   */
  transform(key: string, params?: Record<string, string>): string {
    return this.i18n.t(key, params);
  }
}
