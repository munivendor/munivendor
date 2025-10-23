import { Component, Inject, EventEmitter, Output, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ErrorStateMatcher } from '@angular/material/core';
import { RequestService } from '../services/request.service';
import { CommonModule } from '@angular/common';
import { CancellationReasons } from '../model/cancellationreasons.model';
import { Request } from '../model/request.model';

export interface DialogData {
  action: string;
  request: Request;
  value: number;
  reasonNote: string;
}

export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched || isSubmitted)
    );
  }
}

@Component({
  selector: 'cancellation-reason-dialog',
  templateUrl: './cancellation-reason-dialog.component.html',
  standalone: true,
  styleUrls: ['./cancellation-reason-dialog.component.css'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    CommonModule,
  ],
})
export class CancellationReasonDialog implements OnInit {
  cancellationReasonId = new FormControl<number | null>(null, [
    Validators.required,
  ]);
  cancellationReasonNote = new FormControl({ value: '', disabled: true });
  requestCancellationReasons: CancellationReasons[] = [];

  matcher = new MyErrorStateMatcher();

  @Output() cancelConfirmed = new EventEmitter<{
    request: any;
    action: string;
    reasonId: number;
    reasonNote: string;
  }>();

  constructor(
    public dialogRef: MatDialogRef<CancellationReasonDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.getCancellationReasons();
    this.cancellationReasonId.valueChanges.subscribe((value) => {
      this.toggleReasonNoteValidation(value);
    });
  }

  toggleReasonNoteValidation(reasonId: any): void {
    // "Other" has requestCancellationReasonId === 10.
    if (reasonId === 10) {
      this.cancellationReasonNote.setValidators([Validators.required]);
      this.cancellationReasonNote.enable();
    } else {
      this.cancellationReasonNote.clearValidators();
      // Clear the value when not "Other"
      this.cancellationReasonNote.setValue('');
      this.cancellationReasonNote.disable();
    }
    this.cancellationReasonNote.updateValueAndValidity();
  }

  getCancellationReasons(): void {
    this.requestService.GetCancellationReasons().subscribe(
      (response) => {
        this.requestCancellationReasons = response;
      },
      (error) => {
        console.error('Error fetching cancellation reasons:', error);
      }
    );
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onConfirmCancelRequest(
    request: any,
    action: string,
    value: any,
    reasonNote: string
  ): void {
    const reasonId = Number(value);
    this.cancelConfirmed.emit({ request, action, reasonId, reasonNote });
    this.dialogRef.close(true);
  }
}
