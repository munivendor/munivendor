
import { RouterLink, RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';

import { Component, OnInit } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';

import { Router } from '@angular/router';
import { User } from '../../shared/model/user.model';

import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../authorization/auth.service';

@Component({
    selector: 'forgot-password',
    standalone: true,
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css'],
    imports: [ReactiveFormsModule, RouterModule, CommonModule, MatButtonModule, MatInputModule, MatCardModule, MatSelectModule, GoogleSigninButtonModule],
})

export class ForgotPasswordComponent implements OnInit {
    forgotPasswordForm!: FormGroup;
    userId!: number;

    constructor(
        private fb: FormBuilder,
        public dialog: MatDialog,
        private authService: AuthService,
        private router: Router
    ) { }

    onSubmit() {
        if (this.forgotPasswordForm.valid) {
            console.log(this.forgotPasswordForm.value);

            let municipalityUser: User = {
                workEmail: this.forgotPasswordForm.controls["email"].value
            };
        }
    }

    ngOnInit() {
        const user = this.authService.getUser();
        if (user) {
            let municipalityUser = user
        }

        this.forgotPasswordForm = this.fb.group({
            email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
        });
    }
}
