import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { StateService } from '../../Request/services/state.service';
import { AuthService } from '../../authorization/auth.service';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';

@Component({
  imports: [MatDialogModule, MatButtonModule],
  standalone: true,
  selector: 'app-request-closed-dialog',
  template: `
    <h2 mat-dialog-title>Request Already Closed</h2>
    <mat-dialog-content>
      <p>
        The request you are trying to access/respond to has already been closed.
        You will be re-directed to the dashboard.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="dialogRef.close()">
        OK
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        padding: 20px 0;
      }
    `,
  ],
})
export class RequestClosedDialogComponent {
  constructor(public dialogRef: MatDialogRef<RequestClosedDialogComponent>) {}
}

@Injectable()
export class ErrorHandlerInterceptor implements HttpInterceptor {
  // Define public endpoints that should skip centralized error handling
  // (they handle their own errors in components)
  private readonly publicPaths: string[] = [
    '/auth/send-reset',
    '/auth/reset-password',
    '/users/validate',
  ];

  // Session/auth check endpoints that fail silently
  private readonly silentPaths: string[] = ['/me', '/auth/check'];

  // URLs where users are EXPECTED to be unauthenticated
  private readonly guestUrls = new Set([
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/email-verification',
    '/validateuser',
    '/reset-password',
  ]);

  constructor(
    private snackBar: MatSnackBar,
    private loggingService: LoggingService,
    private dialog: MatDialog,
    private router: Router,
    private stateService: StateService,
    private authService: AuthService,
    private snackbarNotificationService: SnackbarNotificationService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const isPublicPath = this.publicPaths.some((path) =>
          req.url.includes(path)
        );

        const isSilentPath = this.silentPaths.some((path) =>
          req.url.includes(path)
        );

        if (error.status === 401 && !isPublicPath) {
          this.handle401AuthenticatedSessionExpired(isSilentPath);
          return throwError(() => error);
        }

        if (error.status === 422 && !isPublicPath && !isSilentPath) {
          this.handle422SolicitationClosed();
          return throwError(() => error);
        }

        if (
          !isPublicPath &&
          !isSilentPath &&
          this.authService.isAuthenticated
        ) {
          this.handleSnackbarNon401AuthenticatedError(error, req);
          return throwError(() => error);
        }

        // Only handle errors for non-public, non-silent endpoints
        if (!isPublicPath && !isSilentPath) {
          this.handleError(error, req);
        }

        return throwError(() => error);
      })
    );
  }

  // display session expired snackbar if 401 and user is authenticated
  // ignore 401 if user is on guest URL or unauthenticated
  private handle401AuthenticatedSessionExpired(isSilentPath: boolean): void {
    const currentUrl = this.router.url;
    const isGuestUrl = this.guestUrls.has(currentUrl);

    if (isGuestUrl || isSilentPath) {
      this.authService.setAuthenticated(false);
      return;
    }

    if (this.authService.isAuthenticated) {
      this.authService.setAuthenticated(false);
      this.dialog.closeAll();

      this.snackBar.open(
        'Your session has expired. Please log in again.',
        'Dismiss',
        {
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        }
      );

      this.router.navigate(['/login']);
    } else {
      this.authService.setAuthenticated(false);
    }
  }

  // display dialog for 422 solicitation closed and redirect to dashboard
  private handle422SolicitationClosed(): void {
    this.dialog.closeAll();

    const dialogRef = this.dialog.open(RequestClosedDialogComponent, {
      width: '400px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(() => {
      const organizationTypeId = this.stateService.getOrganizationTypeId();

      switch (organizationTypeId) {
        case 1:
          this.router.navigate(['/requests-view']);
          break;
        case 2:
          this.router.navigate(['/offeror-requests-view']);
          break;
      }
    });
  }

  // Generic error message for non-401 errors when user is authenticated
  private handleSnackbarNon401AuthenticatedError(
    error: HttpErrorResponse,
    req: HttpRequest<any>
  ): void {
    const correlationId = error.error?.correlationId || 'N/A';
    this.snackbarNotificationService.showSnackbarError(correlationId);
  }

  // backup error handler for APIs that do not have personalized logException
  private handleError(error: HttpErrorResponse, req: HttpRequest<any>): void {
    const errorDetails = {
      statusCode: error.status,
      statusText: error.statusText,
      url: req.url,
      method: req.method,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    this.loggingService.logException(
      new Error(`HTTP Error ${error.status}: ${error.statusText}`),
      3,
      {
        ...errorDetails,
        methodName: 'ErrorHandlerInterceptor.handleError',
        className: 'ErrorHandlerInterceptor',
        operation: `${req.method} ${req.url}`,
      }
    );

    const message = this.getErrorMessage(error.status);
    this.snackBar.open(message, 'Dismiss', {
      duration: 15000,
      verticalPosition: 'top',
    });
  }

  private getErrorMessage(status: number): string {
    switch (status) {
      case 0:
        return 'Unable to connect to the server. Please check your internet connection.';
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 500:
        return 'A server error occurred. Please try again later.';
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
