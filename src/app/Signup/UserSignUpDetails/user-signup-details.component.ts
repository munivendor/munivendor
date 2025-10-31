import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../shared/model/user.model';
import { UserService } from '../../shared/service/user.service';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../authorization/auth.service';
import { FlowProgressService } from '../../shared/service/flow-progress.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';

@Component({
  selector: 'app-contact-form',
  templateUrl: './user-signup-details.component.html',
  standalone: true,
  styleUrls: ['./user-signup-details.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
  ],
})
export class UserSignUpDetails implements OnInit {
  userSignupDetailForm: FormGroup;
  user: User | undefined;
  organizationTypeId: number | undefined;
  private destroy$ = new Subject<void>();
  userId!: number;
  // should initially lead to 3, but user designation, payment plan confirmation, billing profile are commented out
  framePageNumber = 6;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private authService: AuthService,
    private flowProgressService: FlowProgressService,
    private _snackBar: MatSnackBar,
    private loggingService: LoggingService
  ) {
    this.userSignupDetailForm = this.fb.group({
      email: [{ value: '', disabled: true }, [Validators.required]],
      firstName: [{ value: '', disabled: true }, Validators.required],
      lastName: [{ value: '', disabled: true }, Validators.required],
      title: ['', [Validators.required, Validators.pattern(/^.{1,40}$/)]],
      workPhoneNumber: [
        '',
        [Validators.required, Validators.pattern(/^(1?\d{10})$/)],
      ],
      personalPhoneNumber: [
        '',
        [Validators.required, Validators.pattern(/^(1?\d{10})$/)],
      ],
    });
  }

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        const userId = user;
        this.getUserDetails(userId);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  getUserDetails(userId: number): void {
    this.userService.getUser(userId).subscribe({
      next: (user: User) => {
        this.user = user;
        this.userId = userId;
        this.userSignupDetailForm.patchValue({
          email: user.workEmail,
          firstName: user.firstName,
          lastName: user.lastName,
        });
        this.userSignupDetailForm.updateValueAndValidity({ onlySelf: true });
        this.organizationTypeId = user.organizationTypeId;
      },
      error: (error) => {
        const correlationId = error?.error?.correlationId;

        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            userId: userId,
            correlationId: correlationId,
            methodName: 'getUserDetails',
            className: 'UserSignUpDetails',
            operation: 'getUser',
          }
        );
      },
    });
  }

  updateUser(user: User): void {
    this.userService.updateUser(user).subscribe({
      next: () => {},
      error: (error) => {
        const correlationId = error?.error?.correlationId;

        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            user: user,
            correlationId: correlationId,
            methodName: 'updateUser',
            className: 'UserSignUpDetails',
            operation: 'updateUser',
          }
        );
      },
    });
  }

  onSubmit(): void {
    if (this.userSignupDetailForm.valid) {
      const updatedUser: User = {
        ...this.user,
        ...this.userSignupDetailForm.value,
      };
      this.updateUser(updatedUser);

      // const flowMap: { [key: number]: string } = {
      //   1: '/user-designation',
      //   2: '/payment-plan-confirmation',
      // };

      // const nextRoute =
      //   this.organizationTypeId !== undefined
      //     ? flowMap[this.organizationTypeId]
      //     : undefined;
      const flowId = this.organizationTypeId === 1 ? 1 : 2;

      // if (nextRoute) {
      this.flowProgressService
        .saveFlowProgress(this.userId, flowId, this.framePageNumber)
        .subscribe({
          next: () => {
            if (flowId === 1) {
              this.router.navigate(['/requests-view']);
            } else {
              this.router.navigate(['/offeror-requests-view']);
            }
          },
          error: (error) => {
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                userId: this.userId,
                flowId: flowId,
                framePageNumber: this.framePageNumber,
                correlationId: correlationId,
                methodName: 'onSubmit',
                className: 'UserSignUpDetails',
                operation: 'saveFlowProgress',
              }
            );
          },
        });
    } else {
      this._snackBar.open(
        'Form is invalid or user data is not loaded yet. Please complete all required fields.',
        'Close',
        { verticalPosition: 'top', duration: 5000 }
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
