import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ ReactiveFormsModule, RouterModule, RouterLink, CommonModule],
  templateUrl:'./municipality.details.component.html' ,
  styleUrls:['./municipality.details.component.css']  
})

export class SignupComponent implements OnInit {
detailForm!: FormGroup;
constructor (private fb: FormBuilder) {}

ngOnInit() {
    this.detailForm = this.fb.group ({ 
      municipality:['municipality (required)', [Validators.required, Validators.minLength(3)]],
      lastname:['address (required)', [Validators.required, Validators.minLength(3)]],
      city:['city (required)', [Validators.required, Validators.minLength(3)]],
      state:['state (required)', [Validators.required, Validators.minLength(3)]],
    })
  }
  onSubmit() {
    // Handle form submission here
    if (this.detailForm.valid) {
      console.log(this.detailForm.value);
      // Additional logic to authenticate user or 
      // perform other actions
      this.detailForm.controls["email"].value
    }
  }
  
}
