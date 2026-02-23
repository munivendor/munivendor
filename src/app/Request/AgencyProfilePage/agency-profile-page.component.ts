import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AgencyProfileService } from '../services/agency-profile.service';
import { StateService } from '../../Request/services/state.service';
import { DecisionMaker } from '../model/decisionmaker.model';

// ── Dialog Component ──────────────────────────────────────────────────────────

@Component({
  selector: 'app-decision-maker-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.isEditMode ? 'Edit Decision Maker' : 'Add Decision Maker' }}
    </h2>

    <mat-dialog-content style="padding-top: 1rem;">
      <div class="alert-error" *ngIf="modalError">⚠️ {{ modalError }}</div>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>First Name</mat-label>
          <input
            matInput
            [(ngModel)]="formData.firstName"
            name="firstName"
            placeholder="e.g. Patricia"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Last Name</mat-label>
          <input
            matInput
            [(ngModel)]="formData.lastName"
            name="lastName"
            placeholder="e.g. Henderson"
          />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Email</mat-label>
        <input
          matInput
          [(ngModel)]="formData.email"
          name="email"
          type="email"
          placeholder="e.g. p.henderson@agency.gov"
        />
      </mat-form-field>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Phone (optional)</mat-label>
          <input
            matInput
            [(ngModel)]="formData.phoneNumber"
            name="phoneNumber"
            placeholder="e.g. (202) 555-0142"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Title (optional)</mat-label>
          <input
            matInput
            [(ngModel)]="formData.title"
            name="title"
            placeholder="e.g. Contracting Officer"
          />
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmitDecisionMaker()"
        [disabled]="isSaving"
      >
        {{
          isSaving
            ? 'Saving...'
            : data.isEditMode
              ? 'Save Changes'
              : 'Add Decision Maker'
        }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 480px;
        padding-top: 0.5rem;
      }
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .full-width {
        width: 100%;
      }
      .alert-error {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
        padding: 0.6rem 0.9rem;
        border-radius: 6px;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class DecisionMakerDialogComponent {
  formData: DecisionMaker;
  modalError = '';
  isSaving = false;
  requestId = 1;

  constructor(
    public dialogRef: MatDialogRef<DecisionMakerDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { isEditMode: boolean; formData: DecisionMaker },
  ) {
    this.formData = { ...data.formData };
  }

  onSubmitDecisionMaker(): void {
    if (
      !this.formData.firstName?.trim() ||
      !this.formData.lastName?.trim() ||
      !this.formData.email?.trim()
    ) {
      this.modalError = 'First name, last name, and email are required.';
      return;
    }
    this.dialogRef.close(this.formData);
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

@Component({
  selector: 'app-agency-profile-page',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './agency-profile-page.component.html',
  styleUrls: ['./agency-profile-page.component.css'],
})
export class AgencyProfilePageComponent implements OnInit {
  requestId = 1;

  decisionMakers: DecisionMaker[] = [];
  isLoading = false;
  errorMessage = '';

  useMockData = false;
  organizationId = this.stateService.getOrganizationId();

  mockDecisionMakers: DecisionMaker[] = [
    {
      decisionMakerId: 1,
      firstName: 'Patricia',
      lastName: 'Henderson',
      email: 'p.henderson@agency.gov',
      title: 'Contracting Officer',
    },
    {
      decisionMakerId: 2,
      firstName: 'Marcus',
      lastName: 'Whitfield',
      email: 'm.whitfield@agency.gov',
      title: 'Program Manager',
    },
  ];

  constructor(
    private agencyProfileService: AgencyProfileService,
    private dialog: MatDialog,
    private stateService: StateService,
  ) {}

  ngOnInit(): void {
    this.loadDecisionMakers();
  }

  loadDecisionMakers(): void {
    if (this.useMockData) {
      this.decisionMakers = [...this.mockDecisionMakers];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.agencyProfileService
      .GetDecisionMakers(this.organizationId ?? 0)
      .subscribe({
        next: (data) => {
          this.decisionMakers = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage =
            'Failed to load decision makers. Please try again.';
          this.isLoading = false;
          console.error(err);
        },
      });
  }

  openAddDecisionMakerDialog(): void {
    const dialogRef = this.dialog.open(DecisionMakerDialogComponent, {
      data: { isEditMode: false, formData: this.emptyDecisionMakerForm() },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: DecisionMaker | null) => {
      if (!result) return;
      this.saveDecisionMaker(result, false);
    });
  }

  openEditDecisionMakerDialog(dm: DecisionMaker): void {
    const formData: DecisionMaker = {
      decisionMakerId: dm.decisionMakerId,
      firstName: dm.firstName ?? '',
      lastName: dm.lastName ?? '',
      email: dm.email ?? '',
      phoneNumber: dm.phoneNumber ?? null,
      title: dm.title ?? null,
    };

    const dialogRef = this.dialog.open(DecisionMakerDialogComponent, {
      data: { isEditMode: true, formData },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: DecisionMaker | null) => {
      if (!result) return;
      this.saveDecisionMaker(result, true);
    });
  }

  private saveDecisionMaker(
    formData: DecisionMaker,
    isEditMode: boolean,
  ): void {
    const call$ = isEditMode
      ? this.agencyProfileService.UpdateDecisionMaker(
          this.organizationId ?? 0,
          formData,
        )
      : this.agencyProfileService.CreateDecisionMaker(
          this.organizationId ?? 0,
          formData,
        );

    call$.subscribe({
      next: () => this.loadDecisionMakers(),
      error: (err) => {
        this.errorMessage = 'Something went wrong. Please try again.';
        console.error(err);
      },
    });
  }

  onDeleteDecisionMaker(requestId: number, decisionMakerId: number): void {
    if (!confirm('Are you sure you want to remove this decision maker?'))
      return;

    if (this.useMockData) {
      this.decisionMakers = this.decisionMakers.filter(
        (dm) => dm.decisionMakerId !== decisionMakerId,
      );
      return;
    }

    this.agencyProfileService
      .DeleteDecisionMaker(requestId, decisionMakerId)
      .subscribe({
        next: () =>
          (this.decisionMakers = this.decisionMakers.filter(
            (dm) => dm.decisionMakerId !== decisionMakerId,
          )),
        error: (err) => {
          this.errorMessage = 'Failed to delete decision maker.';
          console.error(err);
        },
      });
  }

  getDecisionMakerInitials(firstName: string, lastName: string): string {
    const parts = firstName.trim().split(' ');
    const first = parts[0]?.charAt(0) ?? '';
    const last = lastName.trim().charAt(0) ?? '';
    return (parts.length > 1 ? first + last : first).toUpperCase();
  }

  private emptyDecisionMakerForm(): Omit<DecisionMaker, 'decisionMakerId'> {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: null,
      title: null,
    };
  }
}
