import { Component, inject, Inject, OnDestroy } from '@angular/core';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Subject, takeUntil } from 'rxjs';
import { RequestService } from '../../Request/services/request.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { LoggingService } from '../../exceptionhandling/logging.service';

@Component({
  selector: 'submit-confirmation-dialog',
  templateUrl: './submit-confirmation-dialog.component.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
})
export class SubmitConfirmationDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggingService);

  constructor(
    private requestService: RequestService,
    private snackBar: MatSnackBar,
    private router: Router,
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

    this.requestService
      .UpdateRequestStatus(requestId, 9)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const correlationId = response?.correlationId;
          sessionStorage.removeItem('currentResponseId');
          sessionStorage.removeItem('response_in_creation_mode');

          this._logger.logEvent('RequestStatusUpdated', {
            responseId: requestId,
            correlationId,
            responseCode: response?.status,
            methodName: 'confirm',
            className: 'SubmitConfirmationDialogComponent',
            operation: 'update_request_status',
          });

          this._snackBar.open('Offer successfully submitted!', 'Close', {
            verticalPosition: 'top',
          });

          this.router.navigate(['/offeror-requests-view']);
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          const correlationId = err?.error;
          const error = new Error(err.message);
          error.name = 'RequestStatusUpdateFailed';

          this._logger.logException(error, err.status, {
            responseId: requestId,
            correlationId,
            responseCode: err.status,
            methodName: 'confirm',
            className: 'SubmitConfirmationDialogComponent',
            operation: 'update_request_status',
          });

          this._snackBar.open(
            `Failed to submit offer. (Correlation ID: ${correlationId})`,
            'Close',
            { verticalPosition: 'top' }
          );
        },
      });
  }
}
