/**
 * @fileoverview Reverse Words Pipe
 * @description Pipe that reverses each word in a string individually
 * @example
 * 'Hello World' | reverseWords => 'olleH dlroW'
 * 'Angular Signals' | reverseWords => 'ralugnA slangS'
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reverseWords',
  standalone: true,
})
export class ReverseWordsPipe implements PipeTransform {
  /**
   * Transforms a string by reversing each word individually
   * @param value - Input string to transform
   * @returns String with each word reversed, or empty string if invalid input
   */
  transform(value: string | null | undefined): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    return value
      .split(' ')
      .map((word) => this.reverseWord(word))
      .join(' ');
  }

  /**
   * Reverses a single word
   * @param word - Word to reverse
   * @returns Reversed word
   */
  private reverseWord(word: string): string {
    return word.split('').reverse().join('');
  }
}
