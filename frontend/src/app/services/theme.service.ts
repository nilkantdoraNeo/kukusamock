import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  theme: 'light' | 'dark' = 'light';

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      this.applyTheme(saved);
      return;
    }
    this.applyTheme('light');
  }

  applyTheme(next: 'light' | 'dark') {
    this.theme = next;
    const root = this.document.documentElement;
    root.classList.toggle('theme-dark', next === 'dark');
    root.classList.toggle('theme-light', next === 'light');
    localStorage.setItem('theme', next);
  }
}
