import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoSaveService } from './service/auto-save.service';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-vendor-profile',
  templateUrl: './organization-information.component.html',
  styleUrls: ['./organization-information.component.css'],
  standalone: true,
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    MatCardModule, 
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class OrganizationInformationComponent implements OnInit {
  organizationInformationForm!: FormGroup;
  states: string[] = ['New Jersey', 'California', 'Florida', 'New York'];

  constructor(private fb: FormBuilder, private autoSaveService: AutoSaveService) {}

  ngOnInit(): void {
    this.organizationInformationForm = this.fb.group({
      organizationName: ['', Validators.required],
      streetAddress: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
    });

    this.organizationInformationForm.valueChanges.subscribe((changes) => {
      this.autoSaveService.autoSaveForm(changes).subscribe();
    });
  }
}
