import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <button class="theme-toggle-fab" (click)="toggle()">
      <ion-icon [name]="isDark() ? 'moon' : 'sunny'"></ion-icon>
    </button>
  `,
  styles: [`
    .theme-toggle-fab {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--iw-fab-border, rgba(0, 0, 0, 0.1));
      background: var(--iw-fab-bg, #ffffff);
      color: var(--iw-fab-text, #475569);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      transition: all 0.2s ease;

      ion-icon {
        font-size: 20px;
      }

      &:hover {
        transform: scale(1.08);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      }
    }
  `],
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);

  isDark(): boolean {
    return this.themeService.isDark();
  }

  toggle(): void {
    this.themeService.toggle();
  }
}
