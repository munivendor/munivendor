import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-response-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatToolbarModule
  ],
  templateUrl: './response-overview.component.html', // Link to the HTML template
  styleUrls: ['./response-overview.component.css'] // Link to the CSS file (optional)
})
export class ResponseOverviewComponent {
  vendorName = 'Sample Vendor';
  currentDate = new Date();
  checklistItems = ['Item 1', 'Item 2', 'Item 3'];
  documents = ['DocumentA.pdf', 'DocumentB.pdf', 'DocumentC.pdf'];

  constructor(private http: HttpClient) {}

  getPdfUrl(documentName: string): string {
    return `/api/documents/${documentName}`;
  }

  onSubmit() {
    const submission = {
      title: 'Title of Response',
      vendorName: this.vendorName,
      currentDate: this.currentDate,
      checklistItems: this.checklistItems,
      documents: this.documents
    };

    this.http.post('/api/submit', submission).subscribe({
      next: (response) => console.log('Submission successful', response),
      error: (error) => console.error('Submission failed', error)
    });
  }
}