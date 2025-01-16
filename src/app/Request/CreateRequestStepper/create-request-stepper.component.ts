import { Component, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { Document } from '../model/document.model';
import { RequestDocument } from '../model/requestdocument.model';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import { BasicRequestComponent } from '../request-basic.component';
import { RequestOverviewComponent } from '../request-overview.component';
import { RequestRequiredDocumentsComponent } from '../request-required-docs.component';
import { RequestReviewComponent } from '../request-review.component';
import { RequestService } from '../services/request.service';
import { Request } from '../model/request.model';
import { RequestSection } from '../model/requestsection.model';
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
  ],
})

// comments are WIP for when validation is required before users
// are able to move onto the next step
// can save data for each step
// submit the final request data to database
export class CreateRequestStepper {
  @ViewChild(BasicRequestComponent) basicRequestComponent!: BasicRequestComponent;
  receivedProposalSections: RequestSection[] = [];
  requestData!: Request;
  basicsFormGroup!: FormGroup;
  subcategories!: SubCategory[];
  proposalsOverview!: FormGroup;
  requestDocumentsFormGroup!: FormGroup;
  municipalityId = 1;
  requestId!: number;

  requiredDocuments: Document[] = [];
  optionalDocuments: Document[] = [];
  municipalityDocuments: Document[] = [];

  proposalsOverviewFormGroup = this._formBuilder.group({
    // proposalsOverview: ['', Validators.required],
  });
  // requestDocumentsFormGroup = this._formBuilder.group({
  //   // requestDocuments: ['', Validators.required],
  // });
  finalReviewFormGroup = this._formBuilder.group({
    // finalReview: ['', Validators.required],
  });

  constructor(private _formBuilder: FormBuilder, private requestService: RequestService, private route: ActivatedRoute) {
    this.requestDocumentsFormGroup = this._formBuilder.group({});
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('requestId'); 
      this.requestId = idParam ? +idParam : 0; 
    });
  }

  ngOnInit() {
    this.initializeForm();

    if (this.requestId !== 0) {
      this.fetchRequestById(this.requestId);
    }
  }

  //******* Handles request data from basics page *********/ 
  private initializeForm(data: any = null): void {
    this.basicsFormGroup = this._formBuilder.group({
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
      dropdowns: this._formBuilder.array(data?.dropdowns || [this.createDropdownControl()]),
    });

    this.proposalsOverview = this._formBuilder.group({});
  }

  private fetchRequestById(requestId: number): void {
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

  convertTo24HourFormat(dateTimeString: string): string {
    if (!dateTimeString || dateTimeString.startsWith("0001-01-01")) return ''; // Handle invalid placeholder
    
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return ''; // Handle invalid time
    
    return date.toISOString().split('T')[1].substring(0, 5); // Extract HH:mm
  }
  
  // dropdowns is for decision makers
  private createDropdownControls(decisionMakers: any[]): any[] {
    return decisionMakers.map((decisionMaker) =>
      this._formBuilder.group({
        decisionMaker: [decisionMaker?.decisionMakerId || '', Validators.required],
      })
    );
  }

  private createDropdownControl(): any {
    return this._formBuilder.group({
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

  saveRequestData() {
    this.basicRequestComponent.emitRequestData();

    if (this.requestData) {
      this.requestService.CreateRequest(this.requestData).subscribe(
        (responseRequestId: number) => {
          console.log('Request created successfully:', responseRequestId);
          this.requestId = responseRequestId;
        },
        error => {
          console.error('Error creating request:', error);
        }
      );
    }
  }
  //*******************************************************/ 

  //*** Handles proposal overview section data from proposals page ***/
  handleProposalData(data: RequestSection[]): void {
    this.receivedProposalSections = data;
  }

  saveSections(): void {
    this.receivedProposalSections.forEach((section) => {
      const payload = {
        requestId: this.requestId,
        requestSectionId: section.requestSectionId,
        requestSectionTitle: section.requestSectionTitle,
        requestSectionContent: section.requestSectionContent
      };
      this.requestService.SaveRequestSections(section, this.requestId)
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
  //*******************************************************/ 

  //*** Handles checked docs data from documents page ***/
  onDocumentsUpdated(documents: RequestDocument) {
    this.requiredDocuments = documents.required!;
    this.optionalDocuments = documents.optional!;
    this.municipalityDocuments = documents.municipality!;
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
