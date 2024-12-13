import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatInputModule } from '@angular/material/input'; 
import { MatFormFieldModule } from '@angular/material/form-field'; 
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'; 
import { ReactiveFormsModule } from '@angular/forms'

import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core'; 

import { MunicipalityService } from "./Services/municipaliy.service"
import { Municipality } from './model/municipality.model';

@Component({
  selector: 'app-account-setup',
  templateUrl: './municipality.details.component.html',
  styleUrls: ['./municipality.details.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatCardModule, MatSelectModule, MatOptionModule, CommonModule ],

})
export class MunicipalityDetailsComponent implements OnInit {
  municipalityDetailForm: FormGroup;
  states: string[] = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];

  constructor(private fb: FormBuilder,  private municipalityService: MunicipalityService) {
    this.municipalityDetailForm = this.fb.group({
      municipalityName: ['', [Validators.required, Validators.minLength(3)]],
      municipalityAddress: ['', [Validators.required, Validators.minLength(3)]],
      municipalityCity: ['', [Validators.required, Validators.minLength(3)]],
      municipalityState: ['', Validators.required],
      municipalityZipCode: ['', Validators.required, , Validators.minLength(5)],
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.municipalityDetailForm.valid) {
      console.log('Form Submitted', this.municipalityDetailForm.value);
    
      const municipality: Municipality = this.municipalityDetailForm.value;
      this.municipalityService.saveMunicipality(municipality).subscribe ((municipalityId: number)=> {


      })

    }
  }
}
