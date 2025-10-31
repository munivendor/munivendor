import {
  Component,
  Inject,
  EventEmitter,
  Output,
  Input,
  OnDestroy,
} from '@angular/core';
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
import { DocumentService } from '../../shared/service/document.service';
import { RequestService } from '../services/request.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { Subject, switchMap, takeUntil } from 'rxjs';

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
export class ConfirmationDialog implements OnDestroy {
  @Output() cancellationRequested = new EventEmitter<{
    request: any;
    action: string;
  }>();
  @Input() onCancelUpdateRequestStatus!: (request: any, action: string) => void;

  @Output() statusUpdated = new EventEmitter<{
    requestId: number;
    newStatusId: number;
    newStatusDesc: string;
  }>();

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public requestObjAndUserAction: DialogData,
    public dialog: MatDialog,
    private router: Router,
    private documentService: DocumentService,
    private requestService: RequestService,
    private loggingService: LoggingService
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
        if (!this.requestObjAndUserAction.request?.offerorRequestId) {
          return 'If you delete this solicitation your progress will not be saved. Are you sure you want to delete this solicitation?';
        } else {
          return `If you delete your offer (this response), then your progress will not be saved, and any data you uploaded for this response will be permanently deleted. If you decide to begin a new offer in response to this solicitation before the solicitation's close date and time, you will need to start your offer from scratch. Are you sure you want to delete this response?`;
        }
      case 'edit':
        return 'Are you sure you want to edit this solicitation?';
      case 'respond':
        return 'Are you sure you want to respond to this solicitation?';
      case 'continue':
        return 'Are you sure you want to continue working on your response to this solicitation?';
      case 'redownload':
        return 'Are you sure you want to redownload the offeror responses for this solicitation?';
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
      this.dialogRef.close(true);
      return;
    }

    if (this.requestObjAndUserAction.action === 'respond') {
      const sourceId = request.requestId;
      this.router.navigate(['/response-basic', sourceId]);
      this.dialogRef.close(true);
      return;
    }

    if (this.requestObjAndUserAction.action === 'open') {
      this.requestService
        .UpdateRequestStatus(request.requestId, 6)
        .pipe(
          switchMap((res) => {
            this.statusUpdated.emit({
              requestId: request.requestId,
              newStatusId: 6,
              newStatusDesc: 'Opened',
            });
            this.downloadZipDocuments(request);
            return this.requestService.NotifyOfferorSolicitationOpened(
              request.requestId
            );
          })
        )
        .subscribe({
          next: (notifyRes) => {
            this.dialogRef.close(true);
          },
          error: (error) => {
            const correlationId = error?.error?.correlationId;
            const isNotifyError = error.url?.includes(
              'NotifyOfferorSolicitationOpened'
            );

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: request.requestId,
                ...(isNotifyError ? {} : { newRequestStatus: 6 }),
                correlationId: correlationId,
                methodName: 'confirm',
                className: 'ConfirmationDialog',
                operation: isNotifyError
                  ? 'NotifyOfferorSolicitationOpened'
                  : 'UpdateRequestStatus',
              }
            );
            this.dialogRef.close(false);
          },
        });
      return;
    }

    if (this.requestObjAndUserAction.action === 'redownload') {
      this.downloadZipDocuments(request);
      this.dialogRef.close(true);
      return;
    }

    this.dialogRef.close(true);
  }

  private destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  downloadZipDocuments(request: any) {
    this.documentService
      .DownloadOfferorZipDocuments(request.requestId)
      .subscribe({
        next: (zipBlob) => {
          const date = new Date(request.publishDate);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = date.getFullYear();
          const formattedDate = `${month}${day}${year}`;

          const fileName = `${request.requestName}_${formattedDate}.zip`;

          const blobUrl = window.URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.click();
          window.URL.revokeObjectURL(blobUrl);
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: request.requestId,
              correlationId: correlationId,
              methodName: 'downloadZipDocuments',
              className: 'ConfirmationDialog',
              operation: 'DownloadOfferorZipDocuments',
            }
          );
        },
      });
  }

  openCancellationReasonDialog(action: string, request: any): void {
    const cancelDialogRef = this.dialog.open(CancellationReasonDialog, {
      width: '500px',
      data: { action, request },
    });

    cancelDialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((cancelData) => {
        if (cancelData) {
          this.cancellationRequested.emit(cancelData);
        }
      });
  }
}
