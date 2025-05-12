import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms'

import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

import { StateService } from '../../Request/services/state.service';
import { MunicipalityService } from "./services/municipality.service"
import { Municipality } from './model/municipality.model';
import { Subject } from 'rxjs';
import { takeUntil, tap, catchError } from 'rxjs/operators';
import { State } from '../../shared/model/state.model';
import { AuthService } from '../../authorization/auth.service';

@Component({
  selector: 'app-municipality-details',
  templateUrl: './municipality.details.component.html',
  styleUrls: ['./municipality.details.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatOptionModule,
    CommonModule],

})
export class GovernmentAgencyDetailsComponent implements OnInit {
  municipalityDetailForm!: FormGroup;
  states: State[] = [];
  userId!: number;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private municipalityService: MunicipalityService,
    private router: Router,
    private stateService: StateService,
    private authService: AuthService) {
    this.municipalityDetailForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.initializeForm();
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        const userId = user
        if (userId) {
          this.userId = userId;
        } else {
          console.error('No user ID available in authentication state');
        }
      }
    });
    this.municipalityService.getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(states => {
        this.states = states;
      });
  }

  private initializeForm(): void {
    this.municipalityDetailForm = this.fb.group({
      municipalityName: ['', [Validators.required, Validators.minLength(3)]],
      municipalityAddress: ['', [Validators.required, Validators.minLength(3)]],
      municipalityCity: ['', [Validators.required, Validators.minLength(3)]],
      municipalityStateId: ['', Validators.required],
      municipalityZipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
    });
  }

  onSubmit(): void {
    if (this.municipalityDetailForm.invalid) {
      return;
    }
    const municipality: Municipality = this.municipalityDetailForm.value;

    this.municipalityService.saveMunicipality(municipality, this.userId).pipe(
      tap((municipalityId: number) => {
        this.stateService.setMunicipalityId(municipalityId);
        this.router.navigate(['/user-details']);
      }),
      catchError(error => {
        console.error('Error saving municipality:', error);
        throw error;
      }),
      takeUntil(this.destroy$)
    )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}