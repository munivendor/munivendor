import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StateService } from '../../Request/services/state.service';
import {
  CreditPackageService,
  SubmissionCreditUsageItem,
} from '../../Response/services/credit-package.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { MatSort, MatSortModule } from '@angular/material/sort';

interface CreditUsage {
  dateTime: string;
  type: string;
  paymentMethodUsed: string | null;
  lastFourNumbers: string | null;
  solicitationId: string;
  showAccount?: boolean;
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
    MatProgressSpinnerModule,
    MatSortModule,
  ],
})
export class SubmissionCreditsComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private stateService: StateService,
    private creditPackageService: CreditPackageService,
    private loggingService: LoggingService
  ) {}

  private destroy$ = new Subject<void>();
  organizationId = this.stateService.getOrganizationId();
  submissionBalance?: number;
  isLoadingBalance = true;
  isLoadingUsage = true;

  creditUsage = new MatTableDataSource<CreditUsage>([]);

  usageDisplayedColumns: string[] = [
    'dateTime',
    'type',
    'paymentMethodUsed',
    'solicitationId',
  ];

  ngOnInit(): void {
    this.loadSubmissionBalance();
    this.loadSubmissionCreditUsage();
  }

  ngAfterViewInit(): void {
    this.creditUsage.paginator = this.paginator;
  }

  private loadSubmissionBalance(): void {
    if (typeof this.organizationId === 'number') {
      this.creditPackageService
        .getSubmissionBalance(this.organizationId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.submissionBalance = res.submissionBalance;
            this.isLoadingBalance = false;
          },
          error: (error) => {
            this.isLoadingBalance = false;
            const correlationId = error?.error?.correlationId;
            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                organizationId: this.organizationId,
                correlationId: correlationId,
                methodName: 'loadSubmissionBalance',
                className: 'SubmissionCreditsComponent',
                operation: 'getSubmissionBalance',
                userId: this.stateService.getUserId(),
              }
            );
          },
        });
    } else {
      this.isLoadingBalance = false;
    }
  }

  toggleAccountVisibility(usage: CreditUsage): void {
    usage.showAccount = !usage.showAccount;
  }

  private loadSubmissionCreditUsage(): void {
    if (typeof this.organizationId === 'number') {
      this.creditPackageService
        .getSubmissionCreditUsage(this.organizationId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (usageItems: SubmissionCreditUsageItem[]) => {
            const mappedData: CreditUsage[] = usageItems.map((item) => {
              const dateString = item.createDate.endsWith('Z')
                ? item.createDate
                : `${item.createDate}Z`;

              const date = new Date(dateString);

              const dateTimeString = `${date.toLocaleDateString()}\n${date.toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}`;

              return {
                dateTime: dateTimeString,
                type: item.creditChargeDescription || 'N/A',
                paymentMethodUsed: item.paymentMethodDescription || null,
                lastFourNumbers: item.lastFourNumbers || null,
                solicitationId: item.solicitationId?.toString() || 'N/A',
                showAccount: false,
              };
            });

            this.creditUsage.data = mappedData;

            this.creditUsage.sortingDataAccessor = (item, property) => {
              const value = (item as any)[property];
              return typeof value === 'string' ? value.toLowerCase() : value;
            };

            setTimeout(() => {
              if (this.paginator) {
                this.creditUsage.paginator = this.paginator;
              }
              if (this.sort) {
                this.creditUsage.sort = this.sort;
              }
            }, 0);

            this.isLoadingUsage = false;
          },
          error: (error) => {
            this.creditUsage.data = [];
            this.isLoadingUsage = false;
            const correlationId = error?.error?.correlationId;
            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                organizationId: this.organizationId,
                correlationId: correlationId,
                methodName: 'loadSubmissionCreditUsage',
                className: 'SubmissionCreditsComponent',
                operation: 'getSubmissionCreditUsage',
                userId: this.stateService.getUserId(),
              }
            );
          },
        });
    } else {
      this.isLoadingUsage = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
