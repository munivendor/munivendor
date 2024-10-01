import { Component, Inject, EventEmitter, Output, Input } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CancellationReasonDialog } from '../CancellationReasonDialog/cancellation-reason-dialog.component';
import { Request } from '../model/request.model';

export interface DialogData {
  action: string;
  request: Request;
}

@Component({
  selector: 'confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    CancellationReasonDialog
  ],
})
export class ConfirmationDialog {
  @Output() cancellationRequested = new EventEmitter<{ request: any, action: string }>();
  @Input() onCancelUpdateRequestStatus!: (request: any, action: string) => void;

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public requestObjAndUserAction: DialogData,
    public dialog: MatDialog, // Injecting MatDialog for opening another dialog,
  ) {}

  getConfirmationMessage(): string {
    if (this.requestObjAndUserAction.action === 'cancel') {
      const statusDesc = this.requestObjAndUserAction.request.requestStatus.requestStatusDesc;
      if (statusDesc === 'Scheduled') {
        return 'This request is scheduled to go live and canceling it will revert it back to a Draft. Are you sure you want to cancel this request?';
      } else if (statusDesc === 'Live') {
        return 'By law, you will need to provide your reasoning for canceling a live request. Are you sure you want to cancel this request?';
      } else {
        return 'Are you sure you want to cancel this request?';
      }
    }

    switch (this.requestObjAndUserAction.action) {
      case 'delete':
        return 'If you delete this request your progress will not be saved. Are you sure you want to delete this request?';
      case 'edit':
        return 'Are you sure you want to edit this request?';
      default:
        return `Are you sure you want to ${this.requestObjAndUserAction.action} this request?`;
    }
  }


  onNoClick(): void {
    this.dialogRef.close(false);
  }

  confirm(action: string, request: any): void {
    this.dialogRef.close(true); 
    if (this.requestObjAndUserAction.action === 'cancel' && request.requestStatus.requestStatusDesc === "Live") {
      this.openCancellationReasonDialog(action, request);
    } else if (this.requestObjAndUserAction.action === 'cancel' && request.requestStatus.requestStatusDesc === "Scheduled") {
      this.onCancelUpdateRequestStatus(request, action);
    }
  }

  openCancellationReasonDialog(action: string, request: any): void {
    const cancelDialogRef = this.dialog.open(CancellationReasonDialog, {
      width: '500px',
      data:  { action, request }
    });

    cancelDialogRef.componentInstance.cancelConfirmed.subscribe((cancelData: { request: any, action: string }) => {
      this.cancellationRequested.emit(cancelData); // Emit event to parent
    });
  }

   
}
