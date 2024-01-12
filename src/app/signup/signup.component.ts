import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ ReactiveFormsModule, RouterModule, RouterLink, CommonModule],
  templateUrl:'./signup.component.html' ,
  styleUrls:['./signup.component.css']  
})

export class SignupComponent implements OnInit {
  loginForm!: FormGroup;
  ngOnInit() {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email])
    });
  }
  onSubmit() {
    // Handle form submission here
    if (this.loginForm.valid) {
      console.log(this.loginForm.value);
      // Additional logic to authenticate user or 
      // perform other actions
      this.loginForm.controls["email"].value
    }
  }

}