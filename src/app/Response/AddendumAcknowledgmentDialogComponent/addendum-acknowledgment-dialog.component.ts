import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import {
  MatDialogRef,
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SubmitConfirmationDialogComponent } from '../SubmitConfirmationDialog/submit-confirmation-dialog.component';
import { AddendumService } from '../../shared/service/addendum.service';
import { toWords } from 'number-to-words';

const ADDENDUM_ACKNOWLEDGED_EVENT_TYPE_ID = 1;

export interface AddendumAcknowledgmentData {
  responseId: number;
  solicitationId: number;
  organizationId: number;
  agencyName: string;
  addendumCount: number;
}

@Component({
  selector: 'addendum-acknowledgment-dialog',
  templateUrl: './addendum-acknowledgment-dialog.component.html',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    CommonModule,
  ],
})
export class AddendumAcknowledgmentDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  submitError = false;

  readonly acknowledgmentDate = new Date();

  get formattedDate(): string {
    return this.acknowledgmentDate.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  get addendumCountText(): string {
    return toWords(this.data.addendumCount);
  }

  constructor(
    private dialogRef: MatDialogRef<AddendumAcknowledgmentDialogComponent>,
    private dialog: MatDialog,
    private addendumService: AddendumService,
    @Inject(MAT_DIALOG_DATA) public data: AddendumAcknowledgmentData,
  ) {}

  goBack(): void {
    if (this.isSubmitting) return;
    this.dialogRef.close(false);
  }

  confirm(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitError = false;

    const addendumWord =
      this.data.addendumCount === 1 ? 'addendum' : 'addendums';
    const eventNote =
      `As of ${this.formattedDate}, ${this.data.agencyName} released ` +
      `${this.addendumCountText} (${this.data.addendumCount}) ${addendumWord} ` +
      `for this solicitation. The offeror confirmed acknowledgment of all addendums ` +
      `in the Acknowledgement of Receipt of Addenda form uploaded in Step 3 – ` +
      `Required Forms & Documents.`;

    this.addendumService
      .logAddendumAcknowledgment(
        this.data.responseId,
        ADDENDUM_ACKNOWLEDGED_EVENT_TYPE_ID,
        eventNote,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
          this.dialog.open(SubmitConfirmationDialogComponent, {
            width: '600px',
            disableClose: true,
            data: {
              responseId: this.data.responseId,
              solicitationId: this.data.solicitationId,
              organizationId: this.data.organizationId,
              addendumCount: this.data.addendumCount,
            },
          });
        },
        error: () => {
          this.isSubmitting = false;
          this.submitError = true;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
