import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectorRef,
  Output,
  EventEmitter,
} from '@angular/core';
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
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../authorization/auth.service';

function atLeastOneFieldFilledValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormArray)) {
      return null;
    }

    const formArray = control as FormArray;
    const hasAtLeastOneContent = formArray.controls.some((section) => {
      const content = section.get('requestSectionContent')?.value;
      const cleanContent = content?.replace(/<[^>]*>/g, '').trim();
      return cleanContent && cleanContent.length > 0;
    });

    return hasAtLeastOneContent ? null : { atLeastOneFieldRequired: true };
  };
}

@Component({
  selector: 'request-overview',
  standalone: true,
  templateUrl: './request-overview.component.html',
  styleUrls: ['./request-overview.component.css'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    CommonModule,
    MatIconModule,
    ReactiveFormsModule,
    EditorModule,
  ],
})
export class RequestOverviewComponent implements OnInit, OnDestroy {
  @Input() idParam?: string | null | undefined;
  @Output() formValidityChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();

  public editorConfig = {
    selector: '#your-textarea',
    toolbar:
      'bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent',
    height: 300,
    menubar: false,
    plugins: 'lists code',
    setup: (editor: any) => {
      editor.on('input change keyup', () => {
        setTimeout(() => {
          this.proposalSections.updateValueAndValidity();
        }, 100);
      });
    },
  };

  proposalsOverviewFormGroup!: FormGroup;
  requestId!: number | null;
  overviewText: string = '';
  organizationId!: number;
  isFileUploaded: boolean = false;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private cdr: ChangeDetectorRef,
    private stateService: StateService,
    private authService: AuthService
  ) {
    // Wait for app initialization before setting organizationId
    this.authService.appInitialized$.subscribe((initialized) => {
      if (initialized) {
        this.organizationId = this.stateService.getOrganizationId() ?? 0;
        console.log('Organization ID after init:', this.organizationId);

        // If still no organizationId and user is authenticated, try to restore it
        if (!this.organizationId && this.authService.getCurrentUserId()) {
          this.authService.restoreOrganizationId().subscribe((user) => {
            if (user) {
              this.organizationId = this.stateService.getOrganizationId() ?? 0;
              this.cdr.detectChanges();
            }
          });
        }
      }
    });
  }

  ngOnInit(): void {
    this.initializeProposalSections();
  }

  initializeProposalSections(): void {
    this.proposalsOverviewFormGroup = this.fb.group({
      proposalSections: this.fb.array([], [atLeastOneFieldFilledValidator()]),
    });

    if (!this.idParam && !this.requestId) {
      this.getRequestSectionDefaultTitle();
    } else {
      this.getRequestSectionsById(Number(this.idParam));
    }

    this.proposalsOverviewFormGroup.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formValidityChange.emit(this.proposalsOverviewFormGroup.valid);
      });
  }

  get proposalSections(): FormArray {
    return this.proposalsOverviewFormGroup?.get(
      'proposalSections'
    ) as FormArray;
  }

  get hasAtLeastOneFieldError(): boolean {
    return (
      this.proposalSections.hasError('atLeastOneFieldRequired') &&
      this.proposalSections.touched
    );
  }

  addSection() {
    const newSection = this.fb.group({
      requestId: [0],
      requestSectionId: [null],
      requestSectionTitle: ['', Validators.required],
      requestSectionContent: [''],
    });

    newSection
      .get('requestSectionContent')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        setTimeout(() => {
          this.proposalSections.updateValueAndValidity();
        }, 100);
      });

    this.proposalSections.push(newSection);
  }

  getProcessedContent(content: string): string {
    return content.replace(/<br>/g, '<br/>');
  }

  getRequestSectionDefaultTitle(): void {
    this.requestService
      .GetRequestSectionDefaultTitles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          response.forEach(
            (section: {
              requestId: number;
              requestSectionId: number;
              requestSectionTitle: string;
              requestSectionContent: string;
            }) => {
              const sectionGroup = this.fb.group({
                requestId: [section.requestId],
                requestSectionId: [section.requestSectionId],
                requestSectionTitle: [
                  section.requestSectionTitle,
                  Validators.required,
                ],
                requestSectionContent: [section.requestSectionContent],
              });

              sectionGroup
                .get('requestSectionContent')
                ?.valueChanges.pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                  setTimeout(() => {
                    this.proposalSections.updateValueAndValidity();
                  }, 100);
                });

              this.proposalSections.push(sectionGroup);
            }
          );
        },
        error: (error) => {
          console.error('Error fetching default section titles', error);
        },
        complete: () => {
          console.log('Finished loading default section titles.');
        },
      });
  }

  getRequestSectionsById(requestId: number): void {
    this.requestService
      .GetRequestSections(requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          response.requestSections.forEach(
            (section: {
              requestSectionTitle: string;
              requestId: number;
              requestSectionId: number;
              requestSectionContent: string;
            }) => {
              if (section.requestSectionTitle) {
                const sectionGroup = this.fb.group({
                  requestId: [section.requestId],
                  requestSectionId: [section.requestSectionId],
                  requestSectionTitle: [
                    section.requestSectionTitle,
                    Validators.required,
                  ],
                  requestSectionContent: [section.requestSectionContent],
                });

                sectionGroup
                  .get('requestSectionContent')
                  ?.valueChanges.pipe(takeUntil(this.destroy$))
                  .subscribe(() => {
                    setTimeout(() => {
                      this.proposalSections.updateValueAndValidity();
                    }, 100);
                  });

                this.proposalSections.push(sectionGroup);
              }
            }
          );
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching request sections', error);
        },
        complete: () => {
          console.log('Finished loading request sections.');
        },
      });
  }

  saveSections(): void {
    this.requestId = this.stateService.getRequestId();

    const processedSections = this.proposalSections.controls.map((section) => {
      const contentControl = section.get('requestSectionContent');
      if (contentControl) {
        const processedContent = this.getProcessedContent(
          contentControl.value ?? ''
        );
        contentControl.setValue(processedContent, { emitEvent: false });
      }
      return section.value;
    });

    this.proposalsOverviewFormGroup.setValue({
      proposalSections: processedSections,
    });

    if (this.proposalsOverviewFormGroup.valid && this.requestId) {
      this.proposalsOverviewFormGroup.value.proposalSections.forEach(
        (section: {
          requestSectionId: any;
          requestSectionTitle: any;
          requestSectionContent: any;
        }) => {
          const payload = {
            requestId: this.requestId,
            requestSectionId: section.requestSectionId,
            requestSectionTitle: section.requestSectionTitle,
            requestSectionContent: section.requestSectionContent,
          };

          this.requestService
            .SaveRequestSections(payload, this.requestId ?? 0)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                console.log(
                  `Section ${section.requestSectionTitle} saved successfully!`
                );
                if (response.success) {
                  const index = this.proposalSections.controls.findIndex(
                    (control) =>
                      control.get('requestSectionTitle')?.value ===
                      section.requestSectionTitle
                  );

                  if (index !== -1) {
                    // update original data with request section ids returned from API response
                    // so that database does not duplicate rows
                    const proposalSection = this.proposalSections.at(
                      index
                    ) as FormGroup;
                    proposalSection.patchValue({
                      requestSectionId: response.requestSectionId,
                    });
                  }

                  section.requestSectionId = response.requestSectionId;
                } else {
                  console.warn(
                    `Section ${section.requestSectionTitle} not saved successfully.`
                  );
                }
              },
              error: (error) => {
                console.error(
                  `Error saving section ${section.requestSectionTitle}`,
                  error
                );
              },
            });
        }
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
