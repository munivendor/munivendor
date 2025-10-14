import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { Subject, Subscription, timer } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../authorization/auth.service';
import { IdleTimeoutDialogComponent } from '../IdleTimeoutDialog/idle-timeout-dialog.component';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private inactivityTimeoutMinutes = 30;
  private dialogTimeoutMinutes = 5;

  private activityEvents = [
    'mousemove',
    'mousedown',
    'keypress',
    'touchstart',
    'scroll',
  ];
  private activitySubscription?: Subscription;
  private inactivityTimer?: Subscription;
  private dialogTimer?: Subscription;
  private isDialogOpen = false;
  private userActivity$ = new Subject<void>();
  private isBrowser: boolean;
  private authSubscription?: Subscription;

  constructor(
    private ngZone: NgZone,
    private dialog: MatDialog,
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      // 👇 Subscribe to auth state
      this.authSubscription = this.authService.isAuthenticated$.subscribe(
        (isAuthenticated) => {
          if (isAuthenticated) {
            this.startWatching();
          } else {
            this.stopWatching();
          }
        }
      );
    }
  }

  startWatching() {
    if (!this.isBrowser) return;

    // Prevent double registration if called multiple times
    this.stopWatching();

    this.ngZone.runOutsideAngular(() => {
      this.activityEvents.forEach((event) =>
        window.addEventListener(event, this.onUserActivity, true)
      );
    });

    this.resetTimer();

    this.activitySubscription = this.userActivity$.subscribe(() => {
      if (!this.isDialogOpen) this.resetTimer();
    });
  }

  private onUserActivity = () => {
    this.userActivity$.next();
  };

  private resetTimer() {
    this.inactivityTimer?.unsubscribe();
    this.inactivityTimer = timer(
      this.inactivityTimeoutMinutes * 60 * 1000
    ).subscribe(() => {
      this.ngZone.run(() => this.openDialog());
    });
  }

  private openDialog() {
    if (this.isDialogOpen) return;

    this.isDialogOpen = true;
    const dialogRef = this.dialog.open(IdleTimeoutDialogComponent, {
      disableClose: true,
    });

    this.dialogTimer = timer(this.dialogTimeoutMinutes * 60 * 1000).subscribe(
      () => dialogRef.close('timeout')
    );

    dialogRef.afterClosed().subscribe((result) => {
      this.isDialogOpen = false;
      this.dialogTimer?.unsubscribe();

      if (result === 'continue') {
        this.resetTimer();
      } else {
        this.authService.logout();
        this.stopWatching();
      }
    });
  }

  stopWatching() {
    this.activitySubscription?.unsubscribe();
    this.inactivityTimer?.unsubscribe();
    this.dialogTimer?.unsubscribe();

    this.activityEvents.forEach((event) =>
      window.removeEventListener(event, this.onUserActivity, true)
    );
  }
}
