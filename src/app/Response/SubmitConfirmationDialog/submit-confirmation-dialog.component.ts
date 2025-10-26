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
import { StateService } from '../../Request/services/state.service';
import { AuthService } from '../../authorization/auth.service';

@Component({
  selector: 'submit-confirmation-dialog',
  templateUrl: './submit-confirmation-dialog.component.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
})
export class SubmitConfirmationDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private requestService: RequestService,
    private router: Router,
    private stateService: StateService,
    private _snackBar: MatSnackBar,
    private loggingService: LoggingService,
    private authService: AuthService,
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
          // Extract correlationId
          const correlationId = response?.correlationId;
          sessionStorage.removeItem('currentResponseId');
          sessionStorage.removeItem('response_in_creation_mode');

          this.loggingService.logEvent('RequestStatusUpdated', {
            responseId: requestId,
            correlationId: correlationId,
            newRequestStatusId: 9,
            methodName: 'confirm',
            className: 'SubmitConfirmationDialogComponent',
            operation: 'UpdateRequestStatus',
            userId: this.stateService.getUserId(),
            organizationId: this.stateService.getOrganizationId(),
          });

          this._snackBar.open('Offer successfully submitted!', 'Close', {
            verticalPosition: 'top',
          });

          this.router.navigate(['/offeror-requests-view']);
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          // Extract correlationId
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              responseId: requestId,
              correlationId: correlationId,
              newRequestStatusId: 9,
              organizationId: this.stateService.getOrganizationId(),
              methodName: 'confirm',
              className: 'SubmitConfirmationDialogComponent',
              operation: 'UpdateRequestStatus',
              userId: this.stateService.getUserId(),
            }
          );
          if (error.status !== 401 && this.authService.authState.value) {
            this._snackBar.open(
              `Failed to submit offer. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
              'Close',
              { verticalPosition: 'top', duration: 15000 }
            );
          }
        },
      });
  }
}
