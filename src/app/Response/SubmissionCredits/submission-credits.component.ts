import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { StateService } from '../../Request/services/state.service';
import { CreditPackageService } from '../../Response/services/credit-package.service';

interface CreditUsage {
  date: string;
  time: string;
  submissionId: string;
}

@Component({
  selector: 'app-submission-credits',
  templateUrl: './submission-credits.component.html',
  styleUrls: ['./submission-credits.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDialogModule,
  ],
})
export class SubmissionCreditsComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private stateService: StateService,
    private creditPackageService: CreditPackageService
  ) {}

  private destroy$ = new Subject<void>();
  organizationId = this.stateService.getOrganizationId();
  submissionBalance?: number;
  isLoadingBalance = true;

  creditUsage = new MatTableDataSource<CreditUsage>([
    {
      date: '10/2/2025',
      time: '2:30 PM',
      submissionId: 'SUB-2025-001',
    },
    {
      date: '10/16/2025',
      time: '9:45 AM',
      submissionId: 'SUB-2025-002',
    },
    {
      date: '10/18/2025',
      time: '3:15 PM',
      submissionId: 'SUB-2025-003',
    },
    {
      date: '11/21/2025',
      time: '11:30 AM',
      submissionId: 'SUB-2025-004',
    },
    {
      date: '11/30/2025',
      time: '4:20 PM',
      submissionId: 'SUB-2025-005',
    },
    {
      date: '12/11/2025',
      time: '1:10 PM',
      submissionId: 'SUB-2025-006',
    },
  ]);

  usageDisplayedColumns: string[] = ['date', 'time', 'submissionId'];

  ngOnInit(): void {
    this.loadSubmissionBalance();

    setTimeout(() => {
      this.creditUsage.paginator = this.paginator;
    });
  }

  private loadSubmissionBalance(): void {
    if (typeof this.organizationId === 'number') {
      this.creditPackageService
        .getSubmissionBalance(this.organizationId)
        .subscribe({
          next: (res) => {
            this.submissionBalance = res.submissionBalance;
            this.isLoadingBalance = false;
          },
          error: () => {
            this.isLoadingBalance = false;
          },
        });
    } else {
      this.isLoadingBalance = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
