import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'municipality-userrolesection',
    standalone: true,
    templateUrl: './municipality.userroleselection.component.html',
    styleUrls: ['./municipality.userroleselection.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule]
})

export class MunicipalityUserSelectionComponent implements OnInit {
userRoleSelectionForm!: FormGroup;
userRoles = ["City Clerk", "Head of the Legal Department", "A Qualified Purchasing Agent"]

constructor (private fb: FormBuilder,  private route: ActivatedRoute ) {}
  ngOnInit() {

    this.userRoleSelectionForm = this.fb.group ({ 
        userRoles: this.fb.array([false, "Chandigarih", "ludhiana", "amritsar"]),
      
   
      })
      
      
  
    }

     
onSubmit() {
    // Handle form submission here
    if (this.userRoleSelectionForm.valid) {
      console.log(this.userRoleSelectionForm.value);
      // Additional logic to authenticate user or 
      // perform other actions
      this.userRoleSelectionForm.controls["email"].value
    }
  }
  
}
