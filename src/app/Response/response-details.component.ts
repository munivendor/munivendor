import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'response-details',
  templateUrl: './response-details.component.html',
  styleUrls: ['./response-details.component.css'],
  standalone: true,
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
  @Input() sourceIdParam?: string | null | undefined;
  @Input() requestId?: number;
  @Output() formValidityChange = new EventEmitter<boolean>();

  requestSections: RequestSection[] = [];
  responseForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private requestService: RequestService,
    private documentService: DocumentService,
    private fb: FormBuilder,
  ) {
    this.responseForm = this.fb.group({
      responseName: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.initializaRequestSections();
  }

  initializaRequestSections(): void {
    if (this.sourceIdParam) {
      this.getRequestSectionsById(Number(this.sourceIdParam));
    }
  }

  getRequestSectionsById(requestId: number): void {
    this.requestService.GetRequestSections(requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Request sections fetched successfully:', response);
          this.requestSections = response.requestSections;
        },
        error: (error) => {
          console.error('Error fetching request sections', error);
        },
        complete: () => {
          console.log('Finished loading request sections.');
        }
      });
  }
  formattedHtml(html: string): string {
    // Clean up empty paragraphs and excessive line breaks
    const cleanedHtml = html
      .replace(/<p>&nbsp;<\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>');
    
    return cleanedHtml;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}