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
import {
  EditorModule,
  // self-host version
  // EditorComponent,
  // TINYMCE_SCRIPT_SRC,
} from '@tinymce/tinymce-angular';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { Subject, takeUntil, Observable } from 'rxjs';

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
    // EditorComponent,
  ],
  // providers: [
  //   {
  //     provide: TINYMCE_SCRIPT_SRC,
  //     useValue: '/assets/tinymce/tinymce.min.js',
  //   },
  // ],
})
export class RequestOverviewComponent implements OnInit, OnDestroy {
  @Input() idParam?: string | null | undefined;
  @Output() formValidityChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  // cloud version
  public editorConfig = {
    selector: '#your-textarea',
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

  // self-host version
  // init: EditorComponent['init'] = {
  //   plugins: 'lists link image table code help wordcount',
  //   branding: false,
  //   toolbar:
  //     'bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent',
  //   height: 300,
  //   menubar: false,
  //   setup: (editor: any) => {
  //     editor.on('input change keyup', () => {
  //       setTimeout(() => {
  //         this.proposalSections.updateValueAndValidity();
  //       }, 100);
  //     });
  //   },
  // };

  proposalsOverviewFormGroup!: FormGroup;
  requestId!: number | null;
  overviewText: string = '';
  organizationId!: number;
  isFileUploaded: boolean = false;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private cdr: ChangeDetectorRef,
    private stateService: StateService
  ) {
    this.organizationId = this.stateService.getOrganizationId() ?? 0;
  }

  ngOnInit(): void {
    this.initializeProposalSections();
  }

  private createSectionGroup(section: {
    requestId: number;
    requestSectionId: number | null;
    requestSectionTitle: string;
    requestSectionContent: string;
  }): FormGroup {
    const sectionGroup = this.fb.group({
      requestId: [section.requestId],
      requestSectionId: [section.requestSectionId],
      requestSectionTitle: [section.requestSectionTitle, Validators.required],
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

    return sectionGroup;
  }

  initializeProposalSections(): void {
    this.proposalsOverviewFormGroup = this.fb.group({
      proposalSections: this.fb.array([], [atLeastOneFieldFilledValidator()]),
    });

    if (!this.idParam && !this.requestId) {
      this.getRequestSectionDefaultTitle().subscribe({
        next: (response) => {
          response.forEach((section) => {
            this.proposalSections.push(this.createSectionGroup(section));
          });
        },
        error: (err) => console.error('Error fetching default sections', err),
      });
    } else {
      this.getRequestSectionsById(Number(this.idParam)).subscribe({
        next: (response) => {
          if (response?.requestSections?.length > 0) {
            response.requestSections.forEach((section: any) => {
              this.proposalSections.push(this.createSectionGroup(section));
            });
            this.cdr.detectChanges();
          } else {
            this.getRequestSectionDefaultTitle().subscribe({
              next: (response) => {
                response.forEach((section) => {
                  this.proposalSections.push(this.createSectionGroup(section));
                });
              },
            });
          }
        },
        error: (err) => {
          console.error('Error fetching request sections', err);
          this.getRequestSectionDefaultTitle().subscribe({
            next: (response) => {
              response.forEach((section) => {
                this.proposalSections.push(this.createSectionGroup(section));
              });
            },
          });
        },
      });
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

  getRequestSectionDefaultTitle(): Observable<any[]> {
    return this.requestService
      .GetRequestSectionDefaultTitles()
      .pipe(takeUntil(this.destroy$));
  }

  getRequestSectionsById(requestId: number): Observable<any> {
    return this.requestService
      .GetRequestSections(requestId)
      .pipe(takeUntil(this.destroy$));
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
      // Filter sections that have content before making API calls
      const sectionsWithContent =
        this.proposalsOverviewFormGroup.value.proposalSections.filter(
          (section: {
            requestSectionId: any;
            requestSectionTitle: any;
            requestSectionContent: any;
          }) => {
            // Clean the content by removing HTML tags and trim whitespace
            const cleanContent = section.requestSectionContent
              ?.replace(/<[^>]*>/g, '')
              .trim();
            // Only include sections that have actual content
            return cleanContent && cleanContent.length > 0;
          }
        );

      // Process only sections with content
      sectionsWithContent.forEach(
        (
          section: {
            requestSectionId: any;
            requestSectionTitle: any;
            requestSectionContent: any;
          },
          idx: number
        ) => {
          const payload = {
            requestId: this.requestId,
            requestSectionId: section.requestSectionId,
            requestSectionTitle: section.requestSectionTitle,
            requestSectionContent: section.requestSectionContent,
          };

          this.requestService
            .SaveRequestSections(payload, this.requestId ?? 0, idx + 1)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.isSuccess) {
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
