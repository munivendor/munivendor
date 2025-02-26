import { RouterLink, RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Component, OnInit } from '@angular/core';
import { GoogleSigninButtonModule} from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';
import { User } from '../../shared/model/user.model';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../authorization/auth.service';

@Component({
  selector: 'login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [ReactiveFormsModule, RouterModule, CommonModule, MatButtonModule, MatInputModule, MatCardModule, MatSelectModule, GoogleSigninButtonModule],
})

export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  userId!: number;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (this.loginForm.valid) {
      console.log(this.loginForm.value);

      let municipalityUser: User = {
        workEmail: this.loginForm.controls["email"].value
      };
    }
  }

  ngOnInit() {
    const user = this.authService.getUser();
    if (user) {  
         let municipalityUser = user
     }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required]],
    });
  }

  




  
}
