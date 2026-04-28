/**
 * @fileoverview Shared Angular Animations
 * @description Reusable animations for smooth UI transitions
 * @module shared/animations
 */

import { trigger, transition, style, animate } from '@angular/animations';

/**
 * Slide down animation for elements entering/leaving
 * @description Explains the design intent of this unit so related logic stays centralized and reusable.
 * Usage: Add @slideDown to any element in template
 * @constant slideDownAnimation
 */
export const slideDownAnimation = trigger('slideDown', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-10px)', height: 0 }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)', height: '*' })),
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-5px)', height: 0 })),
  ]),
]);

/**
 * Fade in/out animation
 * @description Explains the design intent of this unit so related logic stays centralized and reusable.
 * Usage: Add @fadeInOut to any element in template
 * @constant fadeInOutAnimation
 */
export const fadeInOutAnimation = trigger('fadeInOut', [
  transition(':enter', [style({ opacity: 0 }), animate('300ms ease-in', style({ opacity: 1 }))]),
  transition(':leave', [animate('200ms ease-out', style({ opacity: 0 }))]),
]);

/**
 * Slide in from right animation
 * @description Explains the design intent of this unit so related logic stays centralized and reusable.
 * Usage: Add @slideInRight to any element in template
 * @constant slideInRightAnimation
 */
export const slideInRightAnimation = trigger('slideInRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(20px)' }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(20px)' })),
  ]),
]);
