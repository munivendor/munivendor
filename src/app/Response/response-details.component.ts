import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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

@Component({
  selector: 'app-response-details',
  templateUrl: './response-details.component.html',
  styleUrls: ['./response-details.component.css'],
  standalone: true, // Mark as standalone
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatButtonModule,
  ],
  
})
export class ResponseDetailsComponent implements OnInit {
  requestSections: RequestSection[] = [];
  responseForm: FormGroup;

  constructor(
    private requestService: RequestService,
    private documentService: DocumentService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.responseForm = this.fb.group({
      responseName: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('id');
    if (requestId) {
      this.requestService
        .GetRequestSections(+requestId)
        .subscribe((data) => {
          this.requestSections = data;
        });
    }
  }

  downloadPDF() {
    this.documentService.downloadPDF().subscribe((response) => {
      const blob = new Blob([response], 
        { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    });
}
}
