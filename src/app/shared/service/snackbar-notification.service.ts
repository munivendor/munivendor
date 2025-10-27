import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppConstants } from '../../constants/app.constants';

@Injectable({ providedIn: 'root' })
export class SnackbarNotificationService {
  constructor(private snackBar: MatSnackBar) {}

  showUploadError(correlationId?: string): void {
    const message = `Something went wrong. Please try again later. (Correlation ID: ${
      correlationId ?? 'N/A'
    }). ${AppConstants.SUPPORT_MESSAGE}`;
    this.snackBar.open(message, 'Close', {
      duration: AppConstants.SNACKBAR_DURATION,
      verticalPosition: 'top',
    });
  }
}
