import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
constructor (private fb: FormBuilder) {}

ngOnInit() {
    this.loginForm = this.fb.group ({ 
      firstname:['firstname (required)', [Validators.required, Validators.minLength(3)]],
      lastname:['lastname (required)', [Validators.required, Validators.minLength(3)]],
      email:['email (required)', Validators.email],
      title:'',
      phoneNumber:'phone number (required)',
    })
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
