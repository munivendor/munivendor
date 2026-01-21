import { Component, inject, Inject, OnDestroy } from '@angular/core';
import {
  MatDialogRef,
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { StateService } from '../../Request/services/state.service';
import { CreditPurchaseDialogComponent } from '../CreditPurchaseDialog/credit-purchase-dialog.component';
import { PaymentInfoService } from '../BillingInformation/services/payment-info.service';

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
    private _snackBar: MatSnackBar,
    private loggingService: LoggingService,
    private dialogRef: MatDialogRef<SubmitConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { responseId: string }
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
    this.attemptSubmitOffer(requestId);
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

    this._snackBar.open('Offer successfully submitted!', 'Close', {
      verticalPosition: 'top',
    });

    this.router.navigate(['/offeror-requests-view']);
    this.dialogRef.close(true);
  }

  private handleSubmissionError(requestId: number, error: any): void {
    // no submission credits (conflicts)
    if (error.status === 409) {
      this.dialogRef.close(false);
      this.showCreditPurchaseFlow(requestId);
      return;
    }

    // payment declined
    if (error.status === 402) {
      this._snackBar.open(
        'Payment was declined. Please try a different payment method.',
        'Close',
        {
          verticalPosition: 'top',
          duration: 5000,
        }
      );

      this.dialogRef.close(false);
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
        contextMessage:
          'You need to purchase submission credits to submit this offer.',
      },
    });

    creditDialogRef.afterClosed().subscribe((result) => {
      if (
        result?.success &&
        result?.paymentPlanId &&
        result?.paymentProfileId
      ) {
        this.submitOfferWithPurchase(
          requestId,
          result.paymentProfileId,
          result.paymentPlanId
        );
      } else {
        this.dialog.open(SubmitConfirmationDialogComponent, {
          width: '500px',
          data: { responseId: requestId.toString() },
        });
      }
    });
  }

  private submitOfferWithPurchase(
    requestId: number,
    paymentProfileId: number,
    paymentPlanId: number
  ): void {
    this.paymentInfoService
      .submitOffer(
        this.organizationId ?? 0,
        requestId,
        paymentProfileId,
        paymentPlanId
      )
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
}
