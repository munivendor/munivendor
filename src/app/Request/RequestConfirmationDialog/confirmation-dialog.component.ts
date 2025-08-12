import { Component, Inject, EventEmitter, Output, Input } from '@angular/core';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CancellationReasonDialog } from '../CancellationReasonDialog/cancellation-reason-dialog.component';
import { Request } from '../model/request.model';
import { Router } from '@angular/router';

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
  ],
})
export class ConfirmationDialog {
  @Output() cancellationRequested = new EventEmitter<{
    request: any;
    action: string;
  }>();
  @Input() onCancelUpdateRequestStatus!: (request: any, action: string) => void;

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public requestObjAndUserAction: DialogData,
    public dialog: MatDialog,
    private router: Router
  ) {}

  getConfirmationMessage(): string {
    if (this.requestObjAndUserAction.action === 'cancel') {
      const statusDesc =
        this.requestObjAndUserAction.request.requestStatus?.requestStatusDesc ??
        '';
      if (statusDesc === 'Scheduled') {
        return 'This solicitation is scheduled to go live and canceling it will revert it back to a Draft. Are you sure you want to cancel this solicitation?';
      } else if (statusDesc === 'Live') {
        return 'By law, you will need to provide your reasoning for canceling a live solicitation. Are you sure you want to cancel this solicitation?';
      } else {
        return 'Are you sure you want to cancel this solicitation?';
      }
    }

    switch (this.requestObjAndUserAction.action) {
      case 'delete':
        if (!this.requestObjAndUserAction.request?.sourceRequestId) {
          return 'If you delete this solicitation your progress will not be saved. Are you sure you want to delete this solicitation?';
        } else {
          return 'If you delete your response, it will be permanently removed. Are you sure you want to delete your response to this solicitation?';
        }
      case 'edit':
        return 'Are you sure you want to edit this solicitation?';
      case 'respond':
        return 'Are you sure you want to respond to this solicitation?';
      case 'continue':
        return 'Are you sure you want to continue working on your response to this solicitation?';
      default:
        return `Are you sure you want to ${this.requestObjAndUserAction.action} this solicitation?`;
    }
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  confirm(action: string, request: any): void {
    if (
      this.requestObjAndUserAction.action === 'cancel' &&
      request.requestStatus?.requestStatusDesc === 'Live'
    ) {
      this.openCancellationReasonDialog(action, request);
      this.dialogRef.close(true);
      return;
    } else if (
      this.requestObjAndUserAction.action === 'cancel' &&
      request.requestStatus?.requestStatusDesc === 'Scheduled'
    ) {
      this.onCancelUpdateRequestStatus(request, action);
      this.dialogRef.close(true);
      return;
    }

    // navigates to edit view for agency requests or offeror responses
    if (action === 'edit' || action === 'continue') {
      const sourceId = request.requestId;
      const responseId = request.offerorRequestId;
      if (responseId) {
        this.router.navigate(['/response-basic', sourceId, 'edit', responseId]);
      } else {
        this.router.navigate(['/edit-request-view', sourceId]);
      }
    }

    if (this.requestObjAndUserAction.action === 'respond') {
      const sourceId = request.requestId;
      this.router.navigate(['/response-basic', sourceId]);
    }

    if (this.requestObjAndUserAction.action === 'open') {
      // wip
    }

    this.dialogRef.close(true);
  }

  openCancellationReasonDialog(action: string, request: any): void {
    const cancelDialogRef = this.dialog.open(CancellationReasonDialog, {
      width: '500px',
      data: { action, request },
    });

    cancelDialogRef.componentInstance.cancelConfirmed.subscribe(
      (cancelData: { request: any; action: string }) => {
        this.cancellationRequested.emit(cancelData);
      }
    );
  }
}
