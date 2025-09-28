import { RouterModule } from '@angular/router';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../authorization/auth.service';
import { UserLogin } from '../shared/model/user-login.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoggingService } from '../exceptionhandling/logging.service';

@Component({
  selector: 'login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatSelectModule,
    GoogleSigninButtonModule,
  ],
})
export class LoginComponent implements OnInit {
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggingService);
  loginForm!: FormGroup;

  @ViewChild('googleBtnContainer') googleBtnContainer!: ElementRef;
  buttonWidth = 424;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngAfterViewInit() {
    this.setButtonWidth();
  }

  @HostListener('window:resize')
  onResize() {
    this.setButtonWidth();
  }

  private setButtonWidth() {
    if (this.googleBtnContainer) {
      const containerWidth = this.googleBtnContainer.nativeElement.offsetWidth;
      this.buttonWidth = containerWidth;
    }
  }

  onSubmit(): void {
    const userLogin: UserLogin = {
      username: this.loginForm.controls['email'].value,
      password: this.loginForm.controls['password'].value,
    };

    const email = this.loginForm.controls['email'].value;

    this.authService.login(userLogin).subscribe({
      next: (response) => {
        this.authService.completeEmailLogin(response, email);
      },
      error: (error) => {
        const err = new Error(error.message);
        err.name = 'Login failed';
        this._logger.logException(err, 3, {
          userId: email,
          methodName: 'login',
          className: 'AuthService',
          operation: 'user_authentication'
        }
        );
        this._snackBar.open(
          'Login failed: Invalid email, password, or unauthorized email.',
          'Close',
          {
            verticalPosition: 'top',
          }
        );
      },
    });
  }
}
