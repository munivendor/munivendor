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
import { Subject, switchMap, takeUntil, tap, Observable, finalize } from 'rxjs';
import { LoadingService } from '../../shared/LoadingSpinner/loading.service';

export interface DialogData {
  action: string;
  request: Request;
}

@Component({
  selector: 'request-confirmation-dialog',
  templateUrl: './request-confirmation-dialog.component.html',
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
export class RequestConfirmationDialog implements OnDestroy {
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
    public dialogRef: MatDialogRef<RequestConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public requestObjAndUserAction: DialogData,
    public dialog: MatDialog,
    private router: Router,
    private documentService: DocumentService,
    private requestService: RequestService,
    private loggingService: LoggingService,
    private loadingService: LoadingService,
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
      case 'duplicate':
        return 'Are you sure you want to duplicate this solicitation?';
      default:
        return `Are you sure you want to ${this.requestObjAndUserAction.action} this solicitation?`;
    }
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  confirm(action: string, request: any): void {
    const resolvedAction = this.requestObjAndUserAction.action ?? action;

    switch (resolvedAction) {
      case 'cancel':
        this.handleCancel(request, resolvedAction);
        break;

      case 'edit':
      case 'continue':
        this.handleEditOrContinue(request);
        break;

      case 'respond':
        this.router.navigate(['/response-basic', request.requestId]);
        this.dialogRef.close(true);
        break;

      case 'open':
        this.handleOpen(request);
        break;

      case 'redownload':
        this.handleRedownload(request);
        break;

      case 'duplicate':
        this.handleDuplicate(request);
        break;

      default:
        this.dialogRef.close(false);
        break;
    }
  }

  private handleCancel(request: any, action: string): void {
    const statusDesc = request.requestStatus?.requestStatusDesc;

    if (statusDesc === 'Live') {
      this.openCancellationReasonDialog(action, request);
    } else if (statusDesc === 'Scheduled') {
      this.onCancelUpdateRequestStatus(request, action);
    } else {
      console.warn(`Unexpected status for cancel action: ${statusDesc}`);
    }

    this.dialogRef.close(true);
  }

  private handleEditOrContinue(request: any): void {
    const { requestId, offerorRequestId } = request;

    if (offerorRequestId) {
      this.router.navigate([
        '/response-basic',
        requestId,
        'edit',
        offerorRequestId,
      ]);
    } else {
      this.router.navigate(['/edit-request-view', requestId]);
    }

    this.dialogRef.close(true);
  }

  private handleOpen(request: any): void {
    this.loadingService.show('Downloading...');

    this.downloadZipDocuments(request)
      .pipe(
        switchMap(() => {
          this.loadingService.hide();
          return this.requestService.UpdateRequestStatus(request.requestId, 6);
        }),
        switchMap(() =>
          this.requestService.NotifyOfferorSolicitationOpened(
            request.requestId,
          ),
        ),
        finalize(() => this.loadingService.hide()),
      )
      .subscribe({
        next: () => {
          this.statusUpdated.emit({
            requestId: request.requestId,
            newStatusId: 6,
            newStatusDesc: 'Opened',
          });
          this.dialogRef.close(true);
        },
        error: (error) => this.handleOpenError(error, request),
      });
  }

  private handleOpenError(error: any, request: any): void {
    const errorUrl = error?.url?.toLowerCase?.() || '';
    const correlationId = error?.error?.correlationId;

    const operationMap: Record<string, string> = {
      downloadzipdocuments: 'DownloadZipDocuments',
      download: 'DownloadZipDocuments',
      updaterequeststatus: 'UpdateRequestStatus',
      notifyofferorsolicitationopened: 'NotifyOfferorSolicitationOpened',
    };

    const operation =
      Object.entries(operationMap).find(([key]) =>
        errorUrl.includes(key),
      )?.[1] ?? 'UnknownOperation';

    this.loggingService.logException(
      new Error(`HTTP Error ${error.status}: ${error.statusText}`),
      3,
      {
        requestId: request.requestId,
        methodName: 'handleOpen',
        className: 'RequestConfirmationDialog',
        operation,
        correlationId,
      },
    );

    this.dialogRef.close(false);
  }

  private handleRedownload(request: any): void {
    this.loadingService.show('Re-downloading...');

    this.downloadZipDocuments(request)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (error) => {
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: request.requestId,
              methodName: 'handleRedownload',
              className: 'RequestConfirmationDialog',
              operation: 'DownloadOfferorZipDocuments',
              correlationId: error?.error?.correlationId,
            },
          );
          this.dialogRef.close(false);
        },
      });
  }

  private handleDuplicate(request: any): void {
    this.loadingService.show('Duplicating...');

    this.requestService
      .DuplicateRequest(request.requestId, request.organizationId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (error) => {
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: request.requestId,
              organizationId: request.organizationId,
              methodName: 'handleDuplicate',
              className: 'RequestConfirmationDialog',
              operation: 'DuplicateRequest',
              correlationId: error?.error?.correlationId,
            },
          );
          this.dialogRef.close(false);
        },
      });
  }

  private destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  downloadZipDocuments(request: any): Observable<Blob> {
    return this.documentService
      .DownloadOfferorZipDocuments(request.requestId)
      .pipe(
        tap((zipBlob) => {
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
        }),
      );
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
