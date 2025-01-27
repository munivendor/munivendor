import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-user-type-selection',
  template: './user-type-selection.component.html',
  styleUrls: ['./role-verification.component.css']
})
export class UserTypeSelectionComponent implements OnInit {
  userTypeForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.userTypeForm = this.fb.group({
      userType: ['']  // Initialize the form control
    });
  }

  ngOnInit(): void {}

  
  onSubmit(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLButtonElement;
    const buttonName = target.name;
    if (buttonName === 'municipality') {
      this.userTypeForm.get('userType')?.setValue('municipality');
      // navigate to 

    }
    else if (buttonName === 'vendor') 
    { 
      this.userTypeForm.get('userType')?.setValue('vendor');
    }
  }
}
 
