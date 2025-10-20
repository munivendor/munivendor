import {
  Component,
  EventEmitter,
  // Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RequestService } from '../Request/services/request.service';
import { RequestSection } from '../Request/model/requestsection.model';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { DocumentService } from '../shared/service/document.service';
import {
  // delay, EMPTY, expand, of, switchMap,
  Subject,
  takeUntil,
} from 'rxjs';
import { StateService } from '../Request/services/state.service';
import {
  // MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  // MatDialogRef,
} from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'response-details',
  templateUrl: './response-details.component.html',
  styleUrls: ['./response-details.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
  ],
})
export class ResponseDetailsComponent implements OnInit {
  @Input() sourceIdParam?: string | null | undefined;
  @Input() responseIdParam?: string | null | undefined;
  @Input() requestId?: number;
  @Output() formValidityChange = new EventEmitter<boolean>();
  // commented out code are all needed for autofill
  // @Output() autoFillStatusChange = new EventEmitter<boolean>();

  requestSections: RequestSection[] = [];
  responseForm: FormGroup;
  responseIdFromStateService = this.stateService.getRequestId();

  private destroy$ = new Subject<void>();

  // private dialogRef?: MatDialogRef<AutoFillStatusDialogComponent>;
  // private userClosedDialog = false;
  // private isAutoFillDone = false;
  // private hasShownDialog = false;
  // private pollFrequencyMs: number = 5000;
  // private hasShownSuccessDialog = false;

  constructor(
    private requestService: RequestService,
    private documentService: DocumentService,
    private fb: FormBuilder,
    private stateService: StateService,
    private http: HttpClient,
    public dialog: MatDialog
  ) {
    this.responseForm = this.fb.group({
      responseName: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.initializaRequestSections();

    // const requestId = this.responseIdParam
    //   ? Number(this.responseIdParam)
    //   : this.responseIdFromStateService;
    // if (requestId) {
    //   of(null)
    //     .pipe(
    //       switchMap(() => this.documentService.GetAutoFillStatus(requestId)),
    //       expand(() =>
    //         this.isAutoFillDone
    //           ? EMPTY
    //           : this.documentService.GetAutoFillStatus(requestId).pipe(delay(this.pollFrequencyMs))
    //       ),
    //       takeUntil(this.destroy$)
    //     )
    //     .subscribe({
    //       next: (response) => {
    //         const isComplete = response.isAutoFillComplete;
    //         const frequencySeconds = response.pollFrequency ?? 5;
    //         this.pollFrequencyMs = frequencySeconds * 1000;
    //         this.autoFillStatusChange.emit(isComplete);

    //         if (isComplete) {
    //           this.isAutoFillDone = true;

    //           const successMessage = 'The website has completed auto-filling your forms and documents. ' +
    //             'Click on the Next button at the bottom right to continue to Step 3.';

    //           if (this.dialogRef && !this.userClosedDialog) {
    //             this.dialogRef.componentInstance.data.message = successMessage;
    //             this.hasShownSuccessDialog = true;
    //           } else if (!this.hasShownSuccessDialog) {
    //             this.dialogRef = this.dialog.open(AutoFillStatusDialogComponent, {
    //               width: '400px',
    //               disableClose: false,
    //               data: { message: successMessage }
    //             });

    //             this.hasShownSuccessDialog = true;

    //             this.dialogRef.afterClosed().subscribe(() => {
    //               this.dialogRef = undefined;
    //             });
    //           }
    //         } else {
    //           const loadingMessage =
    //             'The website is currently auto-filling your forms and documents. ' +
    //             'This process usually takes under a minute. The Next button will be enabled once it’s complete.';

    //           if (!this.dialogRef && !this.userClosedDialog && !this.hasShownDialog) {
    //             this.dialogRef = this.dialog.open(AutoFillStatusDialogComponent, {
    //               width: '400px',
    //               disableClose: false,
    //               data: { message: loadingMessage }
    //             });

    //             this.hasShownDialog = true;

    //             this.dialogRef.afterClosed().subscribe(() => {
    //               this.userClosedDialog = true;
    //               this.dialogRef = undefined;
    //             });
    //           }
    //         }
    //       },
    //       error: (err) => {
    //         console.error('Polling error for auto-fill:', err);
    //         this.autoFillStatusChange.emit(false);
    //       }
    //     });
    // }
  }

  initializaRequestSections(): void {
    if (this.sourceIdParam) {
      this.getRequestSectionsById(Number(this.sourceIdParam));
    }
  }

  getRequestSectionsById(requestId: number): void {
    this.requestService
      .GetRequestSections(requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.requestSections = response.requestSections;
        },
        error: (error) => {
          console.error('Error fetching request sections', error);
        },
      });
  }
  formattedHtml(html: string): string {
    const cleanedHtml = html
      .replace(/<p>&nbsp;<\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>');
    return cleanedHtml;
  }

  downloadPDFv2() {
    // Pick the wrapper for your main content
    const content = document.querySelector('.content')?.innerHTML ?? '';

    this.http
      .post(
        '/api/generate-pdf/' + this.sourceIdParam,
        { html: content },
        { responseType: 'blob' }
      )
      .subscribe((response) => {
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Proposals.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// @Component({
//   selector: 'app-auto-fill-status-dialog',
//   template: `
//     <mat-dialog-content>
//       <p>{{ data.message }}</p>
//     </mat-dialog-content>
//     <mat-dialog-actions align="end">
//       <button mat-button mat-dialog-close>OK</button>
//     </mat-dialog-actions>
//   `,
//   standalone: true,
//   imports: [CommonModule, MatDialogModule, MatButtonModule],
// })
// export class AutoFillStatusDialogComponent {
//   constructor(@Inject(MAT_DIALOG_DATA) public data: { message: string }) {}
// }
