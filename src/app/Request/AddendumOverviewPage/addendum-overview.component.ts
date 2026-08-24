import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
  FormArray,
  FormGroup,
  Validators,
  FormBuilder,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorModule } from '@tinymce/tinymce-angular';
import { RequestService } from '../services/request.service';
import { StateService } from '../services/state.service';
import {
  catchError,
  forkJoin,
  Subject,
  switchMap,
  takeUntil,
  tap,
  throwError,
} from 'rxjs';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LoadingService } from '../../shared/LoadingSpinner/loading.service';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';

function allNewAddendumsHaveContentValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormArray)) return null;

    const newSections = (control as FormArray).controls.filter(
      (section) => !section.get('isExisting')?.value,
    );

    if (!newSections.length) {
      return { noAddendumsAdded: true };
    }

    const allComplete = newSections.every((section) => {
      const content = section.get('requestSectionContent')?.value;
      const cleanContent = content?.replace(/<[^>]*>/g, '').trim();
      return cleanContent && cleanContent.length > 0;
    });

    return allComplete ? null : { incompleteAddendum: true };
  };
}

@Component({
  selector: 'addendum-overview',
  standalone: true,
  templateUrl: './addendum-overview.component.html',
  styleUrls: ['./addendum-overview.component.css'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    CommonModule,
    MatIconModule,
    ReactiveFormsModule,
    EditorModule,
    MatSnackBarModule,
    MatCardModule,
    MatDialogModule,
  ],
})
export class AddendumOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private addendumCount = 0;
  existingSectionCount = 0;

  requestId!: number;
  organizationId!: number;

  proposalsOverviewFormGroup!: FormGroup;

  public editorConfig = {
    branding: false,
    toolbar:
      'bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent | spellcheckdialog',
    spellchecker_language: 'en-US',
    height: 300,
    menubar: false,
    plugins: 'lists tinymcespellchecker code',
    setup: (editor: any) => {
      editor.on('input change keyup', () => {
        setTimeout(() => {
          this.proposalSections.updateValueAndValidity();
        }, 100);
      });
    },
  };

  public readonlyEditorConfig = {
    ...this.editorConfig,
    readonly: true,
    toolbar: false,
    menubar: false,
    statusbar: false,
  };

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private cdr: ChangeDetectorRef,
    private stateService: StateService,
    private loggingService: LoggingService,
    private route: ActivatedRoute,
    private router: Router,
    private loadingService: LoadingService,
    private snackbarNotificationService: SnackbarNotificationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {
    this.organizationId = this.stateService.getOrganizationId() ?? 0;
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.requestId = Number(params.get('requestId'));
      this.initializeSections();
    });
  }

  private initializeSections(): void {
    this.proposalsOverviewFormGroup = this.fb.group({
      proposalSections: this.fb.array(
        [],
        [allNewAddendumsHaveContentValidator()],
      ),
    });

    this.requestService
      .GetRequestSections(this.requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const sections = response?.requestSections ?? [];
          sections.forEach((section: any) => {
            this.proposalSections.push(this.createSectionGroup(section, true));
          });
          this.existingSectionCount = this.proposalSections.length;

          // determine highest existing addendum number
          const existingAddendumNumbers = sections
            .map((s: any) => {
              const match = s.requestSectionTitle?.match(/^Addendum\s+(\d+)/i);
              return match ? Number(match[1]) : 0;
            })
            .filter((n: number) => n > 0);

          this.addendumCount = existingAddendumNumbers.length
            ? Math.max(...existingAddendumNumbers)
            : 0;
          this.cdr.detectChanges();
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              correlationId,
              methodName: 'initializeSections',
              className: 'AddendumOverviewComponent',
              operation: 'GetRequestSections',
              userId: this.stateService.getUserId(),
              requestId: this.requestId,
            },
          );
        },
      });
  }

  private createSectionGroup(section: any, readonly = false): FormGroup {
    const group = this.fb.group({
      requestId: [section.requestId],
      requestSectionId: [section.requestSectionId],
      requestSectionTitle: [
        { value: section.requestSectionTitle, disabled: readonly },
        Validators.required,
      ],
      requestSectionContent: [
        { value: section.requestSectionContent, disabled: readonly },
      ],
      addendumSuffix: [''],
      addendumPrefix: [section.requestSectionTitle ?? ''],
      isExisting: [readonly],
    });

    if (!readonly) {
      group
        .get('addendumSuffix')
        ?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe((suffix) => {
          const prefix = group.get('addendumPrefix')?.value ?? '';
          const fullTitle = suffix?.trim()
            ? `${prefix} - ${suffix.trim()}`
            : prefix;
          group
            .get('requestSectionTitle')
            ?.setValue(fullTitle, { emitEvent: false });
        });
    }

    group
      .get('requestSectionContent')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        setTimeout(() => this.proposalSections.updateValueAndValidity(), 100);
      });

    return group;
  }

  get proposalSections(): FormArray {
    return this.proposalsOverviewFormGroup?.get(
      'proposalSections',
    ) as FormArray;
  }

  get hasIncompleteAddendumError(): boolean {
    return (
      this.proposalSections.hasError('incompleteAddendum') &&
      this.proposalSections.touched
    );
  }

  get isSaveDisabled(): boolean {
    return (
      this.proposalSections.controls.filter((s) => !s.get('isExisting')?.value)
        .length === 0 || this.proposalSections.invalid
    );
  }

  isNewSection(index: number): boolean {
    return index >= this.existingSectionCount;
  }

  getAddendumPrefix(index: number): string {
    return `Addendum ${index - this.existingSectionCount + 1}`;
  }

  addSection(): void {
    this.addendumCount++;
    const prefix = `Addendum ${this.addendumCount}`;

    const newSection = this.createSectionGroup(
      {
        requestId: this.requestId,
        requestSectionId: null,
        requestSectionTitle: prefix,
        requestSectionContent: '',
      },
      false,
    );

    this.proposalSections.push(newSection);
    this.proposalSections.markAsTouched();
  }

  getProcessedContent(content: string): string {
    return content.replace(/<br>/g, '<br/>');
  }

  saveSections(): void {
    const newSections = this.proposalSections.controls
      .filter((section) => !section.get('isExisting')?.value)
      .map((section) => {
        const contentControl = section.get('requestSectionContent');
        if (contentControl) {
          contentControl.setValue(
            this.getProcessedContent(contentControl.value ?? ''),
            { emitEvent: false },
          );
        }
        return section.getRawValue();
      })
      .filter((section) => {
        const cleanContent = section.requestSectionContent
          ?.replace(/<[^>]*>/g, '')
          .trim();
        return cleanContent && cleanContent.length > 0;
      });

    const dialogRef = this.dialog.open(AddendumConfirmDialog, {
      width: '450px',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result === 'yes') {
          this.submitSections(newSections);
        } else if (result === 'cancel') {
          this.router.navigate(['/requests-view']);
        }
        // 'no' or backdrop click: do nothing, stay on page
      });
  }

  private submitSections(newSections: any[]): void {
    this.loadingService.show('Saving addendum...');

    const saveObservables = newSections.map((section, idx) => {
      const payload = {
        requestId: this.requestId,
        requestSectionId: section.requestSectionId,
        requestSectionTitle: section.requestSectionTitle,
        requestSectionContent: section.requestSectionContent,
        requestSectionTypeId: 2,
      };

      return this.requestService
        .SaveRequestSections(
          payload,
          this.requestId,
          this.existingSectionCount + idx + 1,
        )
        .pipe(
          catchError((error) => {
            const correlationId = error?.error?.correlationId;
            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                organizationId: this.organizationId,
                correlationId,
                requestSectionsObj: payload,
                methodName: 'submitSections',
                className: 'AddendumOverviewComponent',
                operation: 'SaveRequestSections',
                userId: this.stateService.getUserId(),
                requestId: this.requestId,
              },
            );
            return throwError(() => error);
          }),
        );
    });

    forkJoin(saveObservables)
      .pipe(
        tap(() => console.log('forkJoin completed')),
        switchMap(() =>
          this.requestService.UpdateRequestStatus(
            Number(this.organizationId),
            this.requestId,
            10,
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(
            'Your addendum(s) have been added. Notifications to offerors working on an offer in response to this solicitation have been sent. Notifications to offerors who already submitted an offer in response to this solicitation have also been sent.',
            'Close',
            {
              verticalPosition: 'top',
              panelClass: ['snackbar-success'],
              duration: 10000,
            },
          );
          this.router.navigate(['/requests-view']);
        },
        error: (error) => {
          this.loadingService.hide();
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              correlationId,
              methodName: 'submitSections',
              className: 'AddendumOverviewComponent',
              operation: 'UpdateRequestStatus',
              userId: this.stateService.getUserId(),
              requestId: this.requestId,
            },
          );
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/requests-view']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

@Component({
  selector: 'addendum-confirm-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
  ],
  template: `
    <h2 mat-dialog-title>Add Addendum(s)?</h2>
    <mat-dialog-content>
      <p>Clicking <strong>Yes</strong> will add the addendum(s).</p>
      <p>Clicking <strong>No</strong> will allow you to continue to edit.</p>
      <p>
        Clicking <strong>Cancel</strong> will take you back to the Dashboard and
        not save or add your addendum.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions style="justify-content: space-between">
      <div>
        <button mat-stroked-button [mat-dialog-close]="'cancel'">Cancel</button>
      </div>
      <div>
        <button
          mat-stroked-button
          [mat-dialog-close]="'no'"
          style="margin-left: 8px"
        >
          No
        </button>
        <button
          mat-raised-button
          color="primary"
          [mat-dialog-close]="'yes'"
          style="margin-left: 8px"
        >
          Yes
        </button>
      </div>
    </mat-dialog-actions>
  `,
})
export class AddendumConfirmDialog {}
