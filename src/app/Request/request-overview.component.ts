import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { FormArray, FormGroup, Validators, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RequestSection } from './model/requestsection.model';
import { EditorModule } from '@tinymce/tinymce-angular';

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
    EditorModule
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
  
  @Input() parentProposalsOverviewFormGroup!: FormGroup;
  @Output() proposalOverviewData = new EventEmitter<RequestSection[]>();

  constructor(private fb: FormBuilder) {}

  get proposalSections(): FormArray {
    return this.parentProposalsOverviewFormGroup.get("proposalSections") as FormArray;
  }

  ngOnInit(): void {}

  emitRequestSections(): void {
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
  
      this.proposalOverviewData.emit(this.parentProposalsOverviewFormGroup.value);
    }
  }

  addSection() {
    const newSection = this.fb.group({
      requestId: [0],
      requestSectionId: [null],
      requestSectionTitle: ['', Validators.required],
      requestSectionContent: ['']
    });
    this.proposalSections.push(newSection);
    this.proposalOverviewData.emit(this.parentProposalsOverviewFormGroup.value.proposalSections);
  }

  getProcessedContent(content: string): string {
    // Process the TinyMCE content to replace <br> with <br/> for line breaks
    return content.replace(/<br>/g, '<br/>');
  }
}
