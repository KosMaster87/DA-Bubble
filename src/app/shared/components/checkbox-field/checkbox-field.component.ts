/**
 * @fileoverview Reusable Checkbox Field Component
 * @description Standalone component for custom checkbox with label and error messages
 * @module shared/components/checkbox-field
 */

import { Component, input } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { slideDownAnimation } from '../../animations/slide.animations';

/**
 * Reusable checkbox field component with custom styling and error display
 * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
 * @component CheckboxFieldComponent
 */
@Component({
  selector: 'app-checkbox-field',
  imports: [ReactiveFormsModule],
  templateUrl: './checkbox-field.component.html',
  styleUrl: './checkbox-field.component.scss',
  animations: [slideDownAnimation],
})
export class CheckboxFieldComponent {
  control = input.required<FormControl>();
  id = input.required<string>();
  label = input<string>('');
  errorMessages = input<Record<string, string>>({});

  /**
   * Get error message for current validation state
   * @description Maps current control validation errors to a user-facing error message.
   * @function getErrorMessage
   * @returns {string} Error message or empty string
   */
  getErrorMessage(): string {
    const ctrl = this.control();
    const errors = this.errorMessages();

    if (!ctrl.touched || ctrl.valid) {
      return '';
    }

    const errorKeys = Object.keys(ctrl.errors || {});
    if (errorKeys.length === 0) {
      return '';
    }

    const firstError = errorKeys[0];
    return errors[firstError] || this.getDefaultErrorMessage(firstError);
  }

  /**
   * Get default error message for common validation errors
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @function getDefaultErrorMessage
   * @param {string} errorKey - Validation error key
   * @returns {string} Default error message
   */
  private getDefaultErrorMessage(errorKey: string): string {
    const defaultMessages: Record<string, string> = {
      required: 'This field is required.',
      requiredTrue: 'You must accept this.',
    };
    return defaultMessages[errorKey] || 'Invalid value.';
  }
}
