import { Injectable, Component } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import {
  MatDialog,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Track if we've already shown the dialog to prevent duplicates
  private dialogOpen = false;
  private wasAuthenticated = false;

  constructor(private router: Router, private dialog: MatDialog) {}

  // Call this method from AuthService when user logs in
  setAuthenticated(isAuth: boolean): void {
    this.wasAuthenticated = isAuth;
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Skip dialog for /me endpoint (used for session checking)
          // Skip dialog for auth-related endpoints
          const skipDialogUrls = [
            '/me',
            '/login',
            '/logout',
            '/auth',
            '/organizations',
          ];
          const shouldSkipDialog = skipDialogUrls.some((url) =>
            req.url.includes(url)
          );

          // Only show dialog if:
          // 1. Not already open
          // 2. Not a skipped URL
          // 3. Not already on login page
          if (
            !this.dialogOpen &&
            !shouldSkipDialog &&
            this.router.url !== '/login'
          ) {
            this.dialogOpen = true;

            const dialogRef = this.dialog.open(SessionExpiredDialogComponent, {
              disableClose: true,
              width: '400px',
            });

            dialogRef.afterClosed().subscribe(() => {
              this.dialogOpen = false;
              this.router.navigate(['/login']);
            });
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
