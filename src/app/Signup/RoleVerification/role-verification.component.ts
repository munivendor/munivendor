import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'role-verification',
  templateUrl: './role-verification.component.html',
  styleUrls: ['./role-verification.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    CommonModule
  ]
})
export class RoleVerificationComponent implements OnInit {
  roleVerificationForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router) {
    this.roleVerificationForm = this.fb.group({
      userType: ['']
    });
  }

  ngOnInit(): void { }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    
    const submitter = event.submitter as HTMLButtonElement;
    const buttonName = submitter?.name;
  
    if (buttonName === 'municipality') {
      this.roleVerificationForm.get('userType')?.setValue('municipality');
      this.router.navigate(['/government-agency-details']);
    } 
    else if (buttonName === 'vendor') {
      this.roleVerificationForm.get('userType')?.setValue('vendor');
      this.router.navigate(['/user-details']);
    }
  }
  
}

