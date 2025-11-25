import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="loading-overlay" *ngIf="loadingService.loading$ | async">
      <div class="spinner-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p class="loading-text">{{ loadingService.message$ | async }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        animation: fadeIn 0.2s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .spinner-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        background-color: white;
        padding: 32px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      .loading-text {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #333;
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  constructor(public loadingService: LoadingService) {}
}
