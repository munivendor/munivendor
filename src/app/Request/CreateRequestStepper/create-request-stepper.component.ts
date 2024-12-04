import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { Document } from '../model/document.model';
import { IRequestDocuments } from '../../interfaces/IRequestDocuments';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { StateService } from '../services/state.service';
import { BasicRequestComponent } from '../request-basic.component';
import { RequestOverviewComponent } from '../request-overview.component';
import { RequestRequiredDocumentsComponent } from '../request-required-docs.component';
import { RequestReviewComponent } from '../request-review.component';
import { RequestService } from '../services/request.service';
import { Request } from '../model/request.model';
import { SubCategory } from '../model/subcategory.model';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: 'create-request-stepper',
  templateUrl: 'create-request-stepper.component.html',
  standalone: true,
  imports: [
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    BasicRequestComponent,
    RequestOverviewComponent,
    RequestRequiredDocumentsComponent,
    RequestReviewComponent,
    CommonModule
  ],
})

export class CreateRequestStepper {
  @ViewChild(BasicRequestComponent) basicRequestComponent!: BasicRequestComponent;
  @ViewChild(RequestOverviewComponent) requestOverviewComponent!: RequestOverviewComponent;
  @ViewChild(RequestRequiredDocumentsComponent) requestRequiredDocumentsComponent!: RequestRequiredDocumentsComponent;

  requestId!: number;
  municipalityId = 1;

  basicsFormGroup!: FormGroup;
  requestData!: Request;
  subcategories!: SubCategory[];

  proposalsOverviewFormGroup!: FormGroup;
  receivedProposalSections!: any;

  requestDocumentsFormGroup!: FormGroup;
  requiredDocuments: Document[] = [];
  optionalDocuments: Document[] = [];
  municipalityDocuments: Document[] = [];

  finalReviewFormGroup = this.fb.group({
    // finalReview: ['', Validators.required],
  });
  idParam: string | null | undefined;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef) {
    this.requestDocumentsFormGroup = this.fb.group({});
    this.route.paramMap.subscribe((params) => {
      this.idParam = params.get('requestId');
      this.requestId = this.idParam ? +this.idParam : 0;
    });

  }

  ngOnInit() {
    this.initializeForm();
    this.initializeProposalSections();
    this.initializeRequestDocuments();

    if (this.idParam && this.requestId !== 0) {
      this.getRequestById(this.requestId);
    }
  }

  //******* Handles Request data from basics page *********/ 
  private initializeForm(data: any = null): void {
    this.basicsFormGroup = this.fb.group({
      category: [data?.category || '', Validators.required],
      subcategory: [data?.subcategory || '', Validators.required],
      requestType: [data?.requestType || '', Validators.required],
      requestName: [data?.requestName || '', Validators.required],
      publishDate: [data?.publishDate || '', Validators.required],
      publishTime: [data?.publishTime || '', Validators.required],
      openDate: [data?.openDate || '', Validators.required],
      openTime: [data?.openTime || '', Validators.required],
      contractStartDate: [data?.contractStartDate || '', Validators.required],
      contractEndDate: [data?.contractEndDate || '', Validators.required],
      dropdowns: this.fb.array(data?.dropdowns || [this.createDropdownControl()]),
    });
  }

  private getRequestById(requestId: number): void {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const categories$ = this.requestService.GetCategories();
    const requestTypes$ = this.requestService.GetRequestTypes();
    const subCategories$ = this.requestService.GetAllSubcategories();
    const decisionMakers$ = this.requestService.GetDecisionMakers();

    forkJoin([request$, categories$, requestTypes$, subCategories$, decisionMakers$]).subscribe(
      ([request, categories, requestTypes, subCategories, decisionMakers]) => {
        const category = categories.find((c: { categoryId: any }) => c.categoryId === request.categoryId);
        const requestType = requestTypes.find((r: { requestTypeId: number }) => r.requestTypeId === request.requestTypeId);
        const subCategory = subCategories.find(
          (sc: { subCategoryId: number }) => sc.subCategoryId === request.subCategoryId
        );

        this.subcategories = subCategories.filter(sc => sc.categoryId === request.categoryId);

        const decisionMakersMapped = request.decisionMakerSelections.map(
          (selection: { decisionMakerId: number }) =>
            decisionMakers.find((dm: { decisionMakerId: number }) => dm.decisionMakerId === selection.decisionMakerId)
        ).filter((dm: any) => dm);

        const formData = {
          category: category?.categoryId,
          subcategory: subCategory?.subCategoryId || '',
          requestType: requestType?.requestTypeId,
          requestName: request.requestName,
          publishDate: request.publishDate,
          publishTime: this.convertTo24HourFormat(request.publishDate),
          openDate: request.openDate,
          openTime: this.convertTo24HourFormat(request.openDate),
          contractStartDate: request.contractStart,
          contractEndDate: request.contractEnd,
          dropdowns: this.createDropdownControls(decisionMakersMapped),
        };

        this.initializeForm(formData);

        this.basicRequestComponent.onCategoryChange({ value: formData.category } as MatSelectChange);
      },
      (error: any) => {
        console.error('Error fetching data', error);
      }
    );
  }

  getRequestDetails(requestId: number): void {
    this.requestService.GetRequestDetailsById(requestId).subscribe((data) => {
      this.basicsFormGroup.patchValue({
        category: data.categoryId,
        subcategory: data.subcategoryId,
        requestType: data.requestTypeId,
        requestName: data.requestName,
        publishDate: this.extractDate(data.publishDate),
        openDate: this.extractDate(data.openDate),
        contractStartDate: data.contractStart,
        contractEndDate: data.contractEnd,
      });

      this.dropdowns.clear();
      data.decisionMakerSelections.forEach((decisionMaker: { decisionMakerId: any; }) => {

        this.createDropdownControls(decisionMaker.decisionMakerId);
      });
    });
  }

  extractDate(dateTime: string): string {
    return new Date(dateTime).toISOString().split('T')[0];
  }

  convertTo24HourFormat(dateTimeString: string): string {
    if (!dateTimeString || dateTimeString.startsWith("0001-01-01")) return ''; // Handle invalid placeholder

    // Extract the time part (e.g., "T04:32:00") from the string
    const timeMatch = dateTimeString.match(/T(\d{2}:\d{2}:\d{2})/);
    if (!timeMatch || timeMatch.length < 2) return ''; // Handle invalid time format

    const time = timeMatch[1].substring(0, 5); // Get the HH:mm part (first 5 characters of the matched time)

    return time; // Return the time in 24-hour format
  }

  private createDropdownControls(decisionMakers: any[]): any[] {
    return decisionMakers.map((decisionMaker) =>
      this.fb.group({
        decisionMaker: [decisionMaker?.decisionMakerId || '', Validators.required],
      })
    );
  }

  private createDropdownControl(): any {
    return this.fb.group({
      decisionMaker: ['', Validators.required],
    });
  }

  get dropdowns(): FormArray {
    return this.basicsFormGroup.get('dropdowns') as FormArray;
  }

  addDropdown(): void {
    this.dropdowns.push(this.createDropdownControl());
  }

  onRequestDataReceived(data: Request) {
    this.requestData = data;
  }

  deleteDropdownFromRequest(event: { decisionMakerId: number | null }): void {
    const { decisionMakerId } = event;

    if (decisionMakerId) {
      this.requestService.DeleteDecisionMaker(this.requestId, decisionMakerId).subscribe(
        () => {
          console.log(`Decision Maker with ID ${decisionMakerId} deleted successfully.`);
        },
        (error) => {
          console.error(`Failed to delete Decision Maker with ID ${decisionMakerId}:`, error);
        }
      );
    }
  }

  saveRequestData() {
    this.basicRequestComponent.emitRequestData();
    if (this.idParam !== null) {
      this.getRequestById(this.requestId);
      this.requestService.UpdateRequest(this.requestId, this.requestData).subscribe(
        (responseRequestId: number) => {
          console.log('Request updated successfully:', responseRequestId);
          this.getRequestById(this.requestId);
          this.stateService.setRequestId(this.requestId);
        },
        error => {
          console.error('Error updating Request:', error);
        }
      );
    } else if (this.requestData) {
      this.requestService.CreateRequest(this.requestData).subscribe(
        (responseRequestId: number) => {
          console.log('Request created successfully:', responseRequestId);
          this.requestId = responseRequestId;
          this.stateService.setRequestId(responseRequestId);
        },
        error => {
          console.error('Error creating Request:', error);
        }
      );
    }
  }
  //*******************************************************/ 

  //*** Handles proposal overview section data from proposals page ***/
  initializeProposalSections(): void {
    this.proposalsOverviewFormGroup = this.fb.group({
      proposalSections: this.fb.array([])
    });

    if (!this.requestId) {
      this.getRequestSectionDefaultTitle()
    } else {
      this.getRequestSectionsById(this.requestId)
    }
  }

  get proposalSections(): FormArray {
    return this.proposalsOverviewFormGroup?.get('proposalSections') as FormArray;
  }

  getRequestSectionDefaultTitle(): void {
    this.requestService.GetRequestSectionDefaultTitles().subscribe(
      (response) => {
        response.forEach((section: {
          requestId: number;
          requestSectionId: number;
          requestSectionTitle: string;
          requestSectionContent: string;
        }) => {
          this.proposalSections.push(
            this.fb.group({
              requestId: [section.requestId],
              requestSectionId: [section.requestSectionId],
              requestSectionTitle: [section.requestSectionTitle, Validators.required],
              requestSectionContent: [section.requestSectionContent]
            }));
        })
      }
    )
  }

  getRequestSectionsById(requestId: number): void {
    this.requestService.GetRequestSections(requestId).subscribe(
      (response) => {
        response.forEach((section: { requestId: any; requestSectionId: any; requestSectionTitle: any; requestSectionContent: any; }) => {
          if (section.requestSectionTitle) {
            this.proposalSections.push(
              this.fb.group({
                requestId: [section.requestId],
                requestSectionId: [section.requestSectionId],
                requestSectionTitle: [section.requestSectionTitle, Validators.required],
                requestSectionContent: [section.requestSectionContent],
              })
            );
          }

        });
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching request sections', error);
      }
    );
  }

  onProposalSectionsReceived(sections: any): void {
    this.receivedProposalSections = sections;
  }

  saveSections(): void {
    this.requestOverviewComponent.emitRequestSections();
    if (this.proposalsOverviewFormGroup.valid) {
      this.receivedProposalSections.proposalSections.forEach((section: { requestSectionId: any; requestSectionTitle: any; requestSectionContent: any; }) => {
        const payload = {
          requestId: this.requestId,
          requestSectionId: section.requestSectionId,
          requestSectionTitle: section.requestSectionTitle,
          requestSectionContent: section.requestSectionContent
        };

        this.requestService.SaveRequestSections(payload, this.requestId)
          .subscribe({
            next: (response) => {
              console.log(`Section ${section.requestSectionTitle} saved successfully!`);
            },
            error: (error) => {
              console.error(`Error saving section ${section.requestSectionTitle}`, error);
            }
          });
      });
    }
  }
  //*******************************************************/ 

  //*** Handles checked docs data from documents page ***/
  initializeRequestDocuments(): void {
    this.requestDocumentsFormGroup = this.fb.group({
      requiredStateDocuments: this.fb.array([]),
      optionalDocuments: this.fb.array([]),
      municipalityDocuments: this.fb.array([])
    })

    if (!this.requestId) {
      this.getRequestSectionDefaultTitle()
    } else {
      this.getRequestSectionsById(this.requestId)
    }
  }

  getRequiredDocuments(): void {
    this.requestService.GetRequiredDocuments().subscribe({
      next: (requiredStateDocumentsData: any[]) => {
        this.requiredDocuments = requiredStateDocumentsData
      }
    })
  }

  onDocumentsUpdated(documents: IRequestDocuments) {
    this.requiredDocuments = documents.required;
    this.optionalDocuments = documents.optional;
    this.municipalityDocuments = documents.municipality;
  }

  saveDocuments() {
    const documentIds: number[] = [
      ...this.requiredDocuments,
      ...this.optionalDocuments,
      ...this.municipalityDocuments
    ].map(documentId => documentId.documentId);

    this.requestService.SaveRequestDocuments(this.requestId, documentIds)
      .subscribe(response => {
        console.log('Documents saved successfully:', response);
      }, error => {
        console.error('Error saving documents:', error);
      });
  }
  //*******************************************************/

  // Add handling for final review page
}
