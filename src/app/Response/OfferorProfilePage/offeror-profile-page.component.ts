import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrganizationService } from '../../Organization/Details/services/organization.service';
import { Organization } from '../../Organization/Details/model/organization.model';
import { StateService } from '../../Request/services/state.service';
import { OfferorProfileService } from '../../shared/service/offeror-profile.service';

interface AuthorizingOfficial {
  vendorAuthorizingOfficialId?: number;
  organizationId: number;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
}

@Component({
  selector: 'offeror-profile-page',
  templateUrl: './offeror-profile-page.component.html',
  styleUrls: ['./offeror-profile-page.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule,
    MatCardModule,
    MatTooltipModule,
  ],
})
export class OfferorProfilePageComponent implements OnInit {
  organizationForm!: FormGroup;
  authorizingOfficialForm!: FormGroup;

  authorizingOfficials: AuthorizingOfficial[] = [];
  displayedColumns: string[] = [
    'firstName',
    'lastName',
    'title',
    'email',
    'actions',
  ];

  isAddingNew = false;
  editingOfficialId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForms();

    const organizationId = this.stateService.getOrganizationId();
    if (organizationId) {
      this.loadOrganization(organizationId);
      this.loadAuthorizingOfficials(organizationId);
    }
  }

  private initializeForms(): void {
    this.organizationForm = this.fb.group({
      organizationName: [''],
      address: [''],
      address2: [''],
      city: [''],
      state: [''],
      zipCode: [''],
    });

    this.authorizingOfficialForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(255)],
      ],
    });
  }

  private loadOrganization(organizationId: number): void {
    this.organizationService.getOrganization(organizationId).subscribe({
      next: (org: Organization) => {
        this.organizationForm.patchValue({
          organizationName: org.organizationName,
          address: org.address,
          address2: org.address2,
          city: org.city,
          state: org.state,
          zipCode: org.zipCode,
        });
      },
      error: (err) => {
        console.error('Error fetching organization:', err);
        this.showSnackBar('Error loading organization data');
      },
    });
  }

  private loadAuthorizingOfficials(organizationId: number): void {
    this.offerorProfileService
      .GetOfferorAuthorizingOfficials(organizationId)
      .subscribe({
        next: (officials: AuthorizingOfficial[]) => {
          this.authorizingOfficials = officials;
        },
        error: (err) => {
          console.error('Error fetching authorizing officials:', err);
          this.showSnackBar('Error loading authorizing officials');
        },
      });
  }

  startAddingNew(): void {
    this.isAddingNew = true;
    this.editingOfficialId = null;
    this.authorizingOfficialForm.reset();
  }

  editOfficial(official: AuthorizingOfficial): void {
    this.isAddingNew = false;
    this.editingOfficialId = official.vendorAuthorizingOfficialId || null;
    this.authorizingOfficialForm.patchValue({
      firstName: official.firstName,
      lastName: official.lastName,
      title: official.title,
      email: official.email,
    });
  }

  cancelEdit(): void {
    this.isAddingNew = false;
    this.editingOfficialId = null;
    this.authorizingOfficialForm.reset();
  }

  onSubmit(): void {
    if (this.authorizingOfficialForm.valid) {
      const organizationId = this.stateService.getOrganizationId();
      if (!organizationId) return;

      const authorizingOfficial: AuthorizingOfficial = {
        organizationId: organizationId,
        firstName: this.authorizingOfficialForm.value.firstName,
        lastName: this.authorizingOfficialForm.value.lastName,
        title: this.authorizingOfficialForm.value.title,
        email: this.authorizingOfficialForm.value.email,
      };

      if (this.editingOfficialId) {
        authorizingOfficial.vendorAuthorizingOfficialId =
          this.editingOfficialId;
        this.updateAuthorizingOfficial(authorizingOfficial);
      } else {
        this.addAuthorizingOfficial(authorizingOfficial);
      }
    }
  }

  private addAuthorizingOfficial(official: AuthorizingOfficial): void {
    this.offerorProfileService
      .SaveOfferorAuthorizingOfficial(official)
      .subscribe({
        next: (response) => {
          this.showSnackBar('Authorizing Official added successfully');
          this.cancelEdit();
          this.loadAuthorizingOfficials(official.organizationId);
        },
        error: (err) => {
          this.showSnackBar('Error saving Authorizing Official');
        },
      });
  }

  private updateAuthorizingOfficial(official: AuthorizingOfficial): void {
    this.offerorProfileService
      .UpdateOfferorAuthorizingOfficial(
        official.vendorAuthorizingOfficialId!,
        official
      )
      .subscribe({
        next: (response) => {
          this.showSnackBar('Authorizing Official updated successfully');
          this.cancelEdit();
          this.loadAuthorizingOfficials(official.organizationId);
        },
        error: (err) => {
          this.showSnackBar('Error updating Authorizing Official');
        },
      });
  }

  deleteOfficial(official: AuthorizingOfficial): void {
    if (
      confirm(
        `Are you sure you want to delete ${official.firstName} ${official.lastName}?`
      )
    ) {
      // if (this.offerorProfileService.DeleteOfferorAuthorizingOfficial) {
      //   this.offerorProfileService.DeleteOfferorAuthorizingOfficial(official.vendorAuthorizingOfficialId!).subscribe({
      //     next: () => {
      //       this.showSnackBar('Authorizing Official deleted successfully');
      //       this.loadAuthorizingOfficials(official.organizationId);
      //     },
      //     error: (err) => {
      //       console.error('Error deleting Authorizing Official:', err);
      //       this.showSnackBar('Error deleting Authorizing Official');
      //     },
      //   });
      // } else {
      //   this.showSnackBar('Delete functionality not yet implemented');
      //   console.warn('DeleteOfferorAuthorizingOfficial method not found in service');
      // }
    }
  }

  hasError(fieldName: string, errorType: string): boolean {
    return (
      (this.authorizingOfficialForm.get(fieldName)?.hasError(errorType) &&
        this.authorizingOfficialForm.get(fieldName)?.touched) ||
      false
    );
  }

  getMaxLength(fieldName: string): number {
    const maxLengths: { [key: string]: number } = {
      firstName: 50,
      lastName: 50,
      title: 100,
      email: 255,
    };
    return maxLengths[fieldName] || 0;
  }

  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
    });
  }

  get isFormVisible(): boolean {
    return this.isAddingNew || this.editingOfficialId !== null;
  }

  get submitButtonText(): string {
    return this.editingOfficialId
      ? 'Update Authorizing Official'
      : 'Add Authorizing Official';
  }
}
