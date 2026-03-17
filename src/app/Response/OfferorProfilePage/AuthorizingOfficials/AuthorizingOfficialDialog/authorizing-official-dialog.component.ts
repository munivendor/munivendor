import { Component, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { OfferorProfileService } from '../../../services/offeror-profile.service';
import { SnackbarNotificationService } from '../../../../shared/service/snackbar-notification.service';
import { AuthorizingOfficial } from '../authorizing-officials.component';

@Component({
  selector: 'app-authorizing-official-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './authorizing-official-dialog.component.html',
  styleUrls: ['./authorizing-official-dialog.component.css'],
})
export class AuthorizingOfficialDialogComponent {
  @ViewChild('dialogForm') form!: NgForm;

  formData: AuthorizingOfficial;
  displayPhone = '';
  isSaving = false;

  readonly phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;
  readonly emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  constructor(
    public dialogRef: MatDialogRef<AuthorizingOfficialDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      isEditMode: boolean;
      formData: AuthorizingOfficial;
      organizationId: number;
    },
    private offerorProfileService: OfferorProfileService,
    private snackbar: SnackbarNotificationService,
  ) {
    this.formData = { ...data.formData };
    if (this.formData.phone) {
      this.displayPhone = this.formatPhoneDisplay(this.formData.phone);
    }
  }

  // ── Phone ────────────────────────────────────────────────────────────────

  onPhoneInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    this.displayPhone = this.formatPhoneDisplay(digits);
    this.formData.phone = digits || null;
  }

  formatPhoneDisplay(digits: string): string {
    const d = digits.replace(/\D/g, '');
    if (d.length === 0) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }

  // ── Names ────────────────────────────────────────────────────────────────

  titleCaseField(field: 'firstName' | 'lastName'): void {
    const val = this.formData[field];
    if (val) {
      this.formData[field] = val
        .trim()
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
  }

  onNameKeydown(event: KeyboardEvent): void {
    const controlKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
    ];
    if (controlKeys.includes(event.key)) return;

    if (!/^[a-zA-Z\s\-'.]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  onPhoneKeydown(event: KeyboardEvent): void {
    const controlKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
    ];
    if (controlKeys.includes(event.key)) return;

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // ── Email ────────────────────────────────────────────────────────────────

  normalizeEmail(): void {
    if (this.formData.email) {
      this.formData.email = this.formData.email.trim().toLowerCase();
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.form) return;
    this.form.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.isSaving = true;

    const call$ = this.data.isEditMode
      ? this.offerorProfileService.UpdateOfferorAuthorizingOfficial(
          this.formData.offerorAuthorizingOfficialId!,
          this.formData,
        )
      : this.offerorProfileService.SaveOfferorAuthorizingOfficial(
          this.formData,
        );

    call$.subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
        this.snackbar.showSnackbarSuccess(
          `Authorizing official ${
            this.data.isEditMode ? 'updated' : 'added'
          } successfully.`,
        );
      },
      error: () => {
        this.isSaving = false;
        this.snackbar.showSnackbarError(
          `Failed to ${
            this.data.isEditMode ? 'update' : 'add'
          } authorizing official.`,
        );
      },
    });
  }
}
