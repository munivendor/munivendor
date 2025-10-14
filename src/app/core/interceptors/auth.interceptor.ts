import { Injectable, Component } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import {
  MatDialog,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../authorization/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private dialogOpen = false;

  // 🟢 Define public (unauthenticated) endpoints that should skip interceptor handling
  private readonly publicEndpoints: string[] = [
    '/users/validate', // your token validation API
    '/auth/send-reset', // optional: forgot password
    '/auth/reset-password', // optional: reset password
  ];

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // if request is to a public endpoint, skip ALL auth handling
        const isPublicEndpoint = this.publicEndpoints.some((path) =>
          req.url.includes(path)
        );
        if (isPublicEndpoint) {
          return throwError(() => error);
        }

        // normal 401 handling for private endpoints
        if (error.status === 401) {
          const isSessionCheck =
            req.url.includes('/me') || req.url.includes('/auth/check');

          const isLoggedIn = this.authService.authState.value;

          // show session-expired dialog for logged-in users
          if (
            isLoggedIn &&
            !isSessionCheck &&
            !this.dialogOpen &&
            this.router.url !== '/login'
          ) {
            this.dialogOpen = true;

            const dialogRef = this.dialog.open(SessionExpiredDialogComponent, {
              disableClose: true,
              width: '400px',
            });

            dialogRef.afterClosed().subscribe(() => {
              this.dialogOpen = false;
              this.authService.logout();
            });

            return EMPTY;
          }

          if (isSessionCheck) {
            return EMPTY;
          }
        }
        return throwError(() => error);
      })
    );
  }
}

@Component({
  selector: 'app-session-expired-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Session Expired</h2>
    <mat-dialog-content>
      <p>Your session has expired. Please log in again.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="onClose()">OK</button>
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
export class SessionExpiredDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SessionExpiredDialogComponent>,
    private router: Router
  ) {}

  onClose(): void {
    this.dialogRef.close();
    window.location.href = '/login';
  }
}
