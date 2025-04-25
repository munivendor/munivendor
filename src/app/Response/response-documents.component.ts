import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { DocumentService } from '../shared/service/document.service';
import { RequestService } from '../Request/services/request.service';
import { DocumentInstance } from '../Request/model/documentinstance.model';

@Component({
  selector: 'response-documents',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './response-documents.component.html',
  styleUrls: ['./response-documents.component.css'],
})
export class ResponseDocumentsComponent implements OnInit {
  @Input() requestId?: number;
  displayedColumns: string[] = [
    'formName',
    'notarizationRequired',
    'downloadForm',
    'uploadForm',
    'completionStatus'
  ];
  documentInstances: DocumentInstance[] = [];

  constructor(private documentService: DocumentService, private requestService:RequestService, private route: ActivatedRoute,) {}

  ngOnInit(): void {

    this.loadForms();
  }

  loadForms(): void {
    const requestId = this.route.snapshot.paramMap.get('id');
      if(requestId)
      {
      this.requestService.GetDocumentInstances(+requestId).subscribe((documentInstances) => {
        this.documentInstances = documentInstances;
      });
    }
  }

  downloadForm(formId: number): void {
    //this.formService.downloadForm(formId).subscribe((response) => {
      // Handle file download
     // console.log('Downloading form:', response);
   // });
  }

  uploadForm(formId: number): void {
    // Implement file upload logic
    console.log('Uploading form:', formId);
  }

  uploadResponse(formId: number): void {
    // Implement response upload logic
    console.log('Uploading response for form:', formId);
  }

  continue(formId: number): void {
    // Implement continue logic
    console.log('Continuing with form:', formId);
  }
  
  save()
  {

  }
}