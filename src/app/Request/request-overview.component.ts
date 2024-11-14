import { Component, OnInit, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { RequestService } from './services/request.service';
import { RequestSection } from './model/requestsection.model';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'request-overview',
  standalone: true,
  templateUrl: './request-overview.component.html',
  styleUrls: ['./request-overview.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule, 
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class RequestOverviewComponent implements OnInit {
  @Output() proposalOverviewData = new EventEmitter<RequestSection[]>();

  overviewText: string = '';
  municipalityId: number = 1;
  isFileUploaded: boolean = false;
  requestId: number = 1;
  proposalSections: RequestSection[] = [];

  constructor(
    private requestService: RequestService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.fetchRequestSectionDefaultTitles();
  }

  fetchRequestSections(requestId: number) {
    this.requestService.GetRequestSections(requestId).subscribe(
      (response) => {
        console.log("Completed fetching request sections", response)
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
        this.proposalOverviewData.emit(this.proposalSections);
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching cancellation reasons:', error);
      }
    );
  }

  addSection() {
    this.proposalSections.push({
      requestId: this.requestId,
      requestSectionId: null,
      requestSectionTitle: '',
      requestSectionContent: ''
    });
    this.proposalOverviewData.emit(this.proposalSections);
  }
}
