import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-prohibited-activities',
  templateUrl: './prohibited-activities.component.html',
  styleUrls: ['./prohibited-activities.component.css'],
})
export class ProhibitedActivitiesComponent implements OnInit {
  prohibitedActivitiesForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.prohibitedActivitiesForm = this.fb.group({
      hasOFACIdentification: ['', Validators.required],
      activityDescription: [''],
      involvementInIran: ['', Validators.required],
      detailedDescription: [''],
    });
  }

  onSubmit(): void {
    if (this.prohibitedActivitiesForm.valid) {
      console.log('Prohibited Activities Submitted:', this.prohibitedActivitiesForm.value);
    }
  }
}
