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
customerForm: FormGroup | undefined;
customer = new Customer ();
loginForm!: FormGroup;
constructor (private fb: FormBuilder) {}

ngOnInit() {
    this.customerForm = this.fb.group ({ 
      firstname:'',
      lastname:'',
      email:'',
      title:'',
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
