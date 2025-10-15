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
import { LoggingService } from '../../exceptionhandling/logging.service';

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

  constructor(
    private snackBar: MatSnackBar,
    private loggingService: LoggingService
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

        // Only handle errors for non-public, non-silent endpoints
        if (!isPublicPath && !isSilentPath) {
          this.handleError(error, req);
        }

        return throwError(() => error);
      })
    );
  }

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
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  private getErrorMessage(status: number): string {
    switch (status) {
      case 0:
        return 'Unable to connect to the server. Please check your internet connection.';
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Your session has expired. Please log in again.';
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
