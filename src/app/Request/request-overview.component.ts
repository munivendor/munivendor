import { Component, Output, EventEmitter, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormGroup, Validators, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RequestSection } from './model/requestsection.model';
//import { EditorModule } from '@tinymce/tinymce-angular';
import { RequestService } from './services/request.service';

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
   // EditorModule
  ],
})

export class RequestOverviewComponent implements OnInit {
  public editorConfig = {
    selector: '#your-textarea',
    toolbar: 'bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent',
    height: 300,
    menubar: false,
    plugins: 'lists code',
  };
  
  /*@Input() parentProposalsOverviewFormGroup!: FormGroup;
  @Output() proposalOverviewData = new EventEmitter<RequestSection[]>();
*/

   parentProposalsOverviewFormGroup!: FormGroup;

  constructor(private fb: FormBuilder, private requestService: RequestService,
    private cdr: ChangeDetectorRef) {}

  get proposalSectionsFormArray(): FormArray {
    return this.parentProposalsOverviewFormGroup.get("proposalSections") as FormArray;
  }
 // @Output() proposalOverviewData = new EventEmitter<RequestSection[]>();

  overviewText: string = '';
  municipalityId: number = 1;
  isFileUploaded: boolean = false;
  //requestId: number = 1;
  defaultProposalSections: RequestSection[] = [];

  ngOnInit(): void {
    this.getRequestSectionDefaultTitles();
  }

  /*emitRequestSections(): void {
    if (this.parentProposalsOverviewFormGroup.valid) {
      // Process and prepare sections
      const processedSections = this.proposalSections.controls.map((section) => {
        const contentControl = section.get('requestSectionContent');
        if (contentControl) {
          const processedContent = this.getProcessedContent(contentControl.value);
          contentControl.setValue(processedContent, { emitEvent: false });
        }
        return section.value;
      });
  
      this.parentProposalsOverviewFormGroup.setValue({
        proposalSections: processedSections, 
      });
  
      //this.proposalOverviewData.emit(this.parentProposalsOverviewFormGroup.value);
    }
  }*/

  addSection(requestSectionTitle?: string) {
    const newSection = this.fb.group({
      requestId: [0],
      requestSectionId: [null],
      requestSectionTitle: [requestSectionTitle, Validators.required],
      requestSectionContent: ['']
    });
    this.proposalSectionsFormArray.push(newSection);
   // this.proposalOverviewData.emit(this.parentProposalsOverviewFormGroup.value.proposalSections);
  }

  addDefaultSections ()
  {
    this.defaultProposalSections.forEach ((section)=> {
      this.addSection (section.requestSectionTitle);
    });
  }

  getProcessedContent(content: string): string {
    // Process the TinyMCE content to replace <br> with <br/> for line breaks
    return content.replace(/<br>/g, '<br/>');
  }

  getRequestSectionDefaultTitles() {
    this.requestService.GetRequestSectionDefaultTitles().subscribe(
      (response) => {
        this.defaultProposalSections = [...response];
        this.addDefaultSections ();
       // this.proposalOverviewData.emit(this.proposalSections);
        //this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching cancellation reasons:', error);
      }
    );
  }

  /*addSection() {
    this.proposalSections.push({
      requestId: this.requestId,
      requestSectionId: null,
      requestSectionTitle: '',
      requestSectionContent: ''
    });
    //this.proposalOverviewData.emit(this.proposalSections);
  }*/

  saveSections(requestId: number): void {
    this.defaultProposalSections.forEach((section) => {
      const requestSection = {
        requestId: requestId,
        requestSectionId: section.requestSectionId,
        requestSectionTitle: section.requestSectionTitle,
        requestSectionContent: section.requestSectionContent
      };
      this.requestService.SaveRequestSections(requestSection, requestId)
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
