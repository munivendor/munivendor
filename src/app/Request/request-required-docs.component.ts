import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, ReactiveFormsModule, FormArray, FormBuilder } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';
import { RequestService } from './services/request.service';
import { Document } from './model/document.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RequestDocument } from './model/requestdocument.model';
import { catchError, forkJoin, Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { StateService } from './services/state.service';

@Component({
  selector: 'request-required-documents',
  standalone: true,
  templateUrl: './request-required-docs.component.html',
  styleUrls: ['./request-required-docs.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule]
})
export class RequestRequiredDocumentsComponent implements OnInit, OnDestroy {
  @Input() idParam?: string | null | undefined;

  private destroy$ = new Subject<void>();

  requestDocumentsFormGroup!: FormGroup;
  optionalRequestDocuments: Document[] = [];
  organizationRequestDocuments: Document[] = [];
  files: File[] = [];

  organizationId = 1;
  organizationDocuments: Document[] = [];
  documentId!: number;

  selectedOptionalStateDocs: Document[] = [];
  selectedOrganizationDocs: Document[] = [];
  requestId: any;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    public dialog: MatDialog) { }

  ngOnInit(): void {
    this.initializeRequestDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get requiredStateDocuments(): FormArray {
    return this.requestDocumentsFormGroup.get('requiredStateDocuments') as FormArray;
  }
  get optionalStateDocuments(): FormArray {
    return this.requestDocumentsFormGroup.get('optionalStateDocuments') as FormArray;
  }
  get optionalOrganizationDocuments(): FormArray {
    return this.requestDocumentsFormGroup.get('optionalOrganizationDocuments') as FormArray;
  }

  initializeRequestDocuments(): void {
    this.requestDocumentsFormGroup = this.fb.group({
      requiredStateDocuments: this.fb.array([]),
      optionalStateDocuments: this.fb.array([]),
      optionalOrganizationDocuments: this.fb.array([]),
    });
    if (!this.requestId && !this.idParam) {
      this.getAllDocumentTypes(this.organizationId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Documents fetched and form initialized for creation.');
          },
          error: (error) => {
            console.error('Error fetching documents for creation:', error);
          },
        });
    } else if (this.idParam) {

      forkJoin({
        allDocuments: this.getAllDocumentTypes(this.organizationId, Number(this.idParam)).pipe(
          catchError((error) => {
            console.error('Error in getAllDocumentTypes:', error);
            return of([]);
          })
        ),
        requestDocuments: this.requestService.GetRequestRequiredDocumentsById(Number(this.idParam)).pipe(
          catchError((error) => {
            console.error('Error in GetRequestRequiredDocumentsById:', error);
            return of({ isSuccess: false, documents: [] });
          })
        ),
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: ({ allDocuments, requestDocuments }) => {
            try {
              if (requestDocuments.isSuccess) {

                this.populateRequestDocuments(requestDocuments.documents);
              }

              this.mergeUnselectedDocuments(allDocuments);

              console.log('Documents fetched and form arrays initialized for editing.');
            } catch (err) {
              console.error('Error during form initialization:', err);
            }
          },
          error: (error) => {
            console.error('Error fetching documents for editing:', error);
          },
        });
    }
  }

  getAllDocumentTypes(organizationId: number, requestId?: number): Observable<any> {
    return forkJoin({
      requiredStateDocuments: this.requestService.GetRequiredDocuments(),
      optionalStateDocuments: this.requestService.GetOptionalDocuments(),
      optionalOrganizationDocuments: this.requestService.GetOrganizationDocuments(organizationId),
    }).pipe(
      tap(({ requiredStateDocuments, optionalStateDocuments, optionalOrganizationDocuments }) => {
        if (!requestId) {
          this.populateFormArray(this.requiredStateDocuments, requiredStateDocuments);
          this.populateFormArray(this.optionalStateDocuments, optionalStateDocuments);
          this.populateFormArray(this.optionalOrganizationDocuments, optionalOrganizationDocuments);
        }
      })
    );
  }

  populateRequestDocuments(requestDocuments: RequestDocument[]): void {
    requestDocuments.forEach((document: any) => {
      const documentFormGroup = this.fb.group({
        documentId: [document.documentId],
        documentName: [document.documentName],
        derived: [document.derived],
        documentRequired: [document.documentRequired],
        required: [document.required],
        selected: [document.selected],
      });
      if (document.derived) {
        // Derived = true -> Organization document
        this.optionalOrganizationDocuments.push(documentFormGroup);
      } else if (document.required) {
        // Derived = false, Required = true -> Required State document
        this.requiredStateDocuments.push(documentFormGroup);
      } else {
        // Derived = false, Required = false -> Optional State document
        this.optionalStateDocuments.push(documentFormGroup);
      }
    });
  }

  mergeUnselectedDocuments(allDocuments: any): void {
    const {
      requiredStateDocuments = [],
      optionalStateDocuments = [],
      optionalOrganizationDocuments = []
    } = allDocuments;
    // filter and merge the two data responses based on two criterias:
    // display documents if selected are false from from getAllDocumentTypes
    // but do not display duplicates if getAllDocumentTypes has same documentId as GetRequestRequiredDocumentsById
    const filterUnselected = (documents: any[]) =>
      documents?.filter?.((doc) => !this.isDocumentSelected(doc.documentId)) ?? [];

    this.populateFormArray(this.requiredStateDocuments, filterUnselected(requiredStateDocuments.documents));
    this.populateFormArray(this.optionalStateDocuments, filterUnselected(optionalStateDocuments.documents));
    this.populateFormArray(this.optionalOrganizationDocuments, filterUnselected(optionalOrganizationDocuments.documents));
  }

  isDocumentSelected(documentId: number): boolean {
    return (
      this.requiredStateDocuments.value.some((doc: any) => doc.documentId === documentId) ||
      this.optionalStateDocuments.value.some((doc: any) => doc.documentId === documentId) ||
      this.optionalOrganizationDocuments.value.some((doc: any) => doc.documentId === documentId)
    );
  }

  populateFormArray(formArray: FormArray, response: any): void {
    const documents = Array.isArray(response?.documents) ? response.documents : response;

    documents.forEach((document: any) => {
      if (!this.isDocumentSelected(document.documentId)) {
        formArray.push(
          this.fb.group({
            documentId: [document.documentId],
            documentName: [document.documentName],
            documentRequired: [document.documentRequired ?? false],
            selected: [document.selected ?? false]
          })
        );
      }
    });
  }

  openFileUploadDialog(organizationId: number): void {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '400px',
      height: 'auto',
      data: {
        organizationId,
        organizationDocuments: this.optionalOrganizationDocuments
      }
    });
    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        if (response) {
          console.log('File uploaded successfully:', response);
        }
      });
  }

  onCheckboxChange(formArray: FormArray, idx: number, isChecked: boolean) {
    const documentControl = formArray.at(idx) as FormGroup;
    documentControl.patchValue({ selected: isChecked });
  }

  deleteOrganizationDocument(documentId: number): void {
    this.requestService.DeleteOrganizationDocument(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        () => {
          const formArray = this.optionalOrganizationDocuments;
          const indexToDelete = formArray.controls.findIndex(
            (control) => control.get('documentId')?.value === documentId
          );

          if (indexToDelete > -1) {
            formArray.removeAt(indexToDelete);
            console.log(`Optional organization document id ${documentId} deleted successfully`);
          }
        },
        (error) => {
          console.error('Error deleting optional organization document:', error);
        }
      );
  }

  saveDocuments() {
    this.requestId = this.stateService.getRequestId();
    const updatedRequiredStateDocuments = this.requiredStateDocuments.controls
      .filter((control) => control.value.selected)
      .map((control) => control.value);

    const updatedOptionalStateDocuments = this.optionalStateDocuments.controls
      .filter((control) => control.value.selected)
      .map((control) => control.value);

    const updatedOptionalOrganizationDocuments = this.optionalOrganizationDocuments.controls
      .filter((control) => control.value.selected)
      .map((control) => control.value);

    const documentIds: number[] = [
      ...updatedRequiredStateDocuments,
      ...updatedOptionalStateDocuments,
      ...updatedOptionalOrganizationDocuments
    ].map(documentId => documentId.documentId);

    this.requestService.SaveRequestDocuments(this.requestId, documentIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Documents saved successfully:', response);
          this.stateService.setRequestHasBeenSaved(true);
        },
        error: (error) => {
          console.error('Error saving documents:', error);
        }
      });
  }
}