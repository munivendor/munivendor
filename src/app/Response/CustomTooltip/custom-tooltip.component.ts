import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-custom-tooltip',
  standalone: true,
  template: `
    <div
      class="custom-tooltip-dialog"
      [ngStyle]="{ width: width, transform: transformStyle }"
      (mouseenter)="mouseEnter.emit()"
      (mouseleave)="mouseLeave.emit()"
    >
      <div class="tooltip-header">{{ headerText }}</div>
      <div class="tooltip-body">{{ bodyText }}</div>
      <div *ngIf="subtext !== ''" class="tooltip-subtext">{{ subtext }}</div>
      <div *ngIf="subtextTwo !== ''" class="tooltip-subtext">
        {{ subtextTwo }}
      </div>
      <div class="tooltip-actions">
        <button *ngIf="showCloseButton" mat-button (click)="close.emit()">
          Close
        </button>
        <button
          *ngIf="actionLabel && showActionButton"
          mat-button
          color="primary"
          (click)="action.emit()"
        >
          {{ actionLabel }}
        </button>
      </div>
      <!-- <div class="tooltip-arrow"></div> -->
    </div>
  `,
  styleUrls: ['./custom-tooltip.component.css'],
  imports: [CommonModule, MatButtonModule],
})
export class CustomTooltipComponent {
  @Input() headerText = '';
  @Input() bodyText = '';
  @Input() subtext = '';
  @Input() subtextTwo = '';
  @Input() actionLabel?: string;
  @Input() width: string = 'auto';
  @Input() transformStyle: string = 'translate(-50%, -100%)';
  @Input() showCloseButton: boolean = true;
  @Input() showActionButton: boolean = true;

  @Output() close = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();
  @Output() mouseEnter = new EventEmitter<void>();
  @Output() mouseLeave = new EventEmitter<void>();
}
