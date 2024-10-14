import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { RequestSection } from './model/requestsection.model';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'request-overview',
  standalone: true,
  templateUrl: './request-overview.component.html',
  styleUrls: ['./request-overview.component.css'],
  imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SingleFileUploadComponent, FormsModule, MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class RequestOverviewComponent implements OnInit {
  overviewText: string = '';
  municipalityId: number = 29;
  isFileUploaded: boolean = false;
  requestId: number | null = null;
  isEditMode: boolean = true;
  proposalSections: RequestSection[] = [];

  constructor(
    private stateService: StateService,
    private requestService: RequestService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    // Subscribe to requestId changes from StateService
    // fetchRequestSections will be needed in 'create template/previous request'
    this.stateService.currentRequestId$.subscribe((id: number | null) => {
      this.requestId = id;
      if (this.requestId) {
        this.fetchRequestSections(this.requestId);
      }
    });
    this.fetchRequestSectionDefaultTitles();
  }

  fetchRequestSections(requestId: number) {
    this.requestService.GetRequestSections(requestId).subscribe(
      (response) => {
        // first time creation of requests will always return empty array
       console.log("response", response)
      },
      (error) => {
        console.error('Error fetching request sections:', error);
      }
    );
  }

  fetchRequestSectionDefaultTitles() {
    this.requestService.GetRequestSectionDefaultTitles().subscribe(
      (response) => {
        this.proposalSections = [...response];
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching cancellation reasons:', error);
      }
    );
  }

  onEdit() {
    this.isEditMode = true;
  }

  onSave() {
    this.isEditMode = false;
    const requestId = this.stateService.getRequestId();

    // Ensure requestId is valid (not null or undefined)
    if (requestId === null || requestId === undefined) {
      return; // Stop execution if requestId is invalid
    }
    this.proposalSections.forEach((section) => {
      const payload = {
        requestId: requestId,
        // section Id needs to be null on for first time creation of requests
        requestSectionId: null,
        requestSectionTitle: section.requestSectionTitle, 
        requestSectionContent: section.requestSectionContent
      };
      this.requestService.SaveRequestSections(payload)
        .subscribe({
          next: (response) => {
            console.log(`Section ${section.requestSectionTitle} saved successfully!`, response);
          },
          error: (error) => {
            console.error(`Error saving section ${section.requestSectionTitle}`, error);
          }
        });
    });
  }

  addSection() {
    // this.proposalSections.push({
    //   title: 'Enter Title',
    //   description: 'Enter Description'
    // });
  }
}
