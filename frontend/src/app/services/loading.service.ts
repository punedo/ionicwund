import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  isLoading = signal(false);
  message = signal<string | undefined>(undefined);

  show(message?: string): void {
    this.message.set(message);
    this.isLoading.set(true);
  }

  hide(): void {
    this.isLoading.set(false);
    this.message.set(undefined);
  }
}
