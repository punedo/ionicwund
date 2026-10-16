import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'iw_theme';
const DARK_CLASS = 'ion-palette-dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _isDark = signal(false);
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    this.init();
  }

  private init(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      this._isDark.set(stored === 'dark');
    } else {
      this._isDark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    this.applyTheme();
  }

  toggle(): void {
    this._isDark.update((v) => !v);
    this.applyTheme();
  }

  setDark(isDark: boolean): void {
    this._isDark.set(isDark);
    this.applyTheme();
  }

  private applyTheme(): void {
    const isDark = this._isDark();
    document.documentElement.classList.toggle(DARK_CLASS, isDark);
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  }
}
