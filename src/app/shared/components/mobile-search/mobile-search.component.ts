/**
 * @fileoverview Mobile Search Component
 * @description Search bar optimized for mobile view
 * @module shared/components/mobile-search
 */

import { Component, output } from '@angular/core';

@Component({
  selector: 'app-mobile-search',
  imports: [],
  templateUrl: './mobile-search.component.html',
  styleUrl: './mobile-search.component.scss',
})
export class MobileSearchComponent {
  searchChanged = output<string>();

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChanged.emit(value);
  }
}
