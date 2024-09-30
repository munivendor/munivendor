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
import { MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ErrorStateMatcher } from '@angular/material/core';
import { RequestService } from '../services/request.service';
import { CommonModule } from '@angular/common';

export interface DialogData {
  action: string;
  item: any;
  value: number;
  otherNote: string;
}

/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
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
    CommonModule
  ],
})
export class CancellationReasonDialog implements OnInit  {
  cancellationReason = new FormControl('', [Validators.required]);
  otherNoteControl = new FormControl({ value: '', disabled: true }); // Initially disabled
  cancellationReasonsList: any[] = [];  // To store the cancellation reasons fetched from the API

  // Error matcher
  matcher = new MyErrorStateMatcher();

  @Output() cancelConfirmed = new EventEmitter<{ item: any, action: string, value: string, otherNote: string }>();


  constructor(
    public dialogRef: MatDialogRef<CancellationReasonDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.fetchCancellationReasons();
    // Watch the cancellationReason control value to enable or disable the otherNoteControl
    this.cancellationReason.valueChanges.subscribe((selectedValue) => {
      if (selectedValue?.toString() === '10') {
        this.otherNoteControl.enable();
      } else {
        this.otherNoteControl.disable();
        this.otherNoteControl.reset();
      }
    });
  }

  fetchCancellationReasons(): void {
    this.requestService.GetCancellationReasons().subscribe(
      (response) => {
        this.cancellationReasonsList = response;
      },
      (error) => {
        console.error('Error fetching cancellation reasons:', error);
      }
    );
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  confirm(item: any, action: string, value: any, otherNote: string): void {
    if (this.cancellationReason.valid) {
      this.cancelConfirmed.emit({ item, action, value, otherNote });
      this.dialogRef.close(true);
    }
  }
}
