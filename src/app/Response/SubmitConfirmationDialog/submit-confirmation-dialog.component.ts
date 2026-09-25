import { Component, inject, Inject, OnDestroy } from '@angular/core';
import {
  MatDialogRef,
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { StateService } from '../../Request/services/state.service';
import { CreditPurchaseDialogComponent } from '../CreditPurchaseDialog/credit-purchase-dialog.component';
import { PaymentInfoService } from '../BillingInformation/services/payment-info.service';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';
import { AddendumService } from '../../shared/service/addendum.service';

@Component({
  selector: 'submit-confirmation-dialog',
  templateUrl: './submit-confirmation-dialog.component.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
})
export class SubmitConfirmationDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private dialog = inject(MatDialog);
  organizationId = this.stateService.getOrganizationId();

  constructor(
    private paymentInfoService: PaymentInfoService,
    private router: Router,
    private stateService: StateService,
    private dialogRef: MatDialogRef<SubmitConfirmationDialogComponent>,
    private snackbarNotificationService: SnackbarNotificationService,
    private addendumService: AddendumService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      responseId: string;
      solicitationId?: number;
      organizationId?: number;
      addendumCount?: number;
    },
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  confirm(): void {
    const requestId = +this.data.responseId;

    if (this.data.solicitationId && this.data.addendumCount) {
      this.addendumService
        .SaveSolicitationAddendumResponse(
          this.data.solicitationId,
          requestId,
          this.organizationId ?? 0,
          this.data.addendumCount,
        )
        .pipe(
          takeUntil(this.destroy$),
          switchMap(() =>
            this.paymentInfoService.submitOffer(
              this.organizationId ?? 0,
              requestId,
            ),
          ),
        )
        .subscribe({
          next: () => this.cleanupSessionAndNavigate(),
          error: (error) => this.handleSubmissionError(requestId, error),
        });
    } else {
      this.attemptSubmitOffer(requestId);
    }
  }

  private attemptSubmitOffer(requestId: number): void {
    this.paymentInfoService
      .submitOffer(this.organizationId ?? 0, requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cleanupSessionAndNavigate();
        },
        error: (error) => {
          this.handleSubmissionError(requestId, error);
        },
      });
  }

  private cleanupSessionAndNavigate(): void {
    sessionStorage.removeItem('currentResponseId');
    sessionStorage.removeItem('response_in_creation_mode');

    this.snackbarNotificationService.showSnackbarSuccess(
      'Offer submitted successfully.',
    );

    this.router.navigate(['/offeror-requests-view']);
    this.dialogRef.close(true);
  }

  private handleSubmissionError(requestId: number, error: any): void {
    // no submission credits (conflicts)
    if (
      error.status === 402 &&
      error.error?.detail === 'NO_SUBMISSION_CREDITS_LEFT'
    ) {
      this.dialogRef.close(false);
      this.showCreditPurchaseFlow(requestId);
      return;
    }

    this.dialogRef.close(false);
  }

  private showCreditPurchaseFlow(requestId: number): void {
    this.dialogRef.close(false);

    const creditDialogRef = this.dialog.open(CreditPurchaseDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      disableClose: true,
      data: {
        organizationId: this.organizationId,
        requestId: requestId,
        showCreditSelection: true,
        isForSubmission: true,
        contextMessage:
          'You need to purchase submission credits to submit this offer.',
      },
    });

    creditDialogRef.afterClosed().subscribe((result) => {
      if (result?.success && result?.submitted) {
        this.cleanupSessionAndNavigate();
      }
    });
  }
}
