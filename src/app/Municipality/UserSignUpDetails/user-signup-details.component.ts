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
import { Subject, takeUntil  } from 'rxjs';
import { AuthService } from '../../authorization/auth.service';

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
        MatCardModule]
})
export class UserSignUpDetails
    implements OnInit {
    userSignupDetailForm: FormGroup;
    user: User | undefined;
    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private router: Router,
        private authService: AuthService
    ) {
        this.userSignupDetailForm = this.fb.group({
            email: [{ value: '', disabled: true }, [Validators.required,]],
            firstName: [{ value: '', disabled: true }, Validators.required],
            lastName: [{ value: '', disabled: true }, Validators.required],
            title: ['', [Validators.required, Validators.pattern(/^.{1,10}$/)]],
            workPhoneNumber: ['', [Validators.required, Validators.pattern(/^(1?\d{10})$/)
            ]],
            personalPhoneNumber: ['', [Validators.required, Validators.pattern(/^(1?\d{10})$/)
            ]],
        });
    }

    ngOnInit(): void {
        this.authService.user$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(user => {
            if (user) {
                const userId = user.userId
                if (userId) {
                    this.getUserDetails(userId);
                } else {
                    console.error('No user ID available in authentication state');
                }
            } else {
                this.router.navigate(['/login']);
            }
        });
    }

    getUserDetails(userId: number): void {
        this.userService.getUser(userId).subscribe(
            (user: User) => {
                this.user = user;

                this.userSignupDetailForm.patchValue({
                    email: user.workEmail,
                    firstName: user.firstName,
                    lastName: user.lastName,
                });
                this.userSignupDetailForm.updateValueAndValidity({ onlySelf: true });
            },
            (error) => {
                console.error('Error fetching user data:', error);
            }
        );
    }

    updateUser(user: User): void {
        this.userService.updateUser(user).subscribe(() => {
            console.log("Success updating user")
        },
            (error) => {
                console.error('Error fetching user data:', error);
            }
        );
    }

    onSubmit(): void {
        if (this.userSignupDetailForm.valid) {
            const updatedUser: User = { ...this.user, ...this.userSignupDetailForm.value };
            this.updateUser(updatedUser);
            this.router.navigate(['/user-designation'])
        } else {
            console.error('Form is invalid or user data is not loaded yet.');
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
