import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  Inject,
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { StateService } from '../../Request/services/state.service';
import { CreditPurchaseDialogComponent } from '../CreditPurchaseDialog/credit-purchase-dialog.component';
import {
  CreditPackageService,
  CreditPackage,
} from '../services/credit-package.service';
import { PaymentInfoService } from '../BillingInformation/services/payment-info.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';
import { MatSort, MatSortModule } from '@angular/material/sort';

interface OrderHistory {
  dateTime: string;
  paymentMethodUsed: string;
  total: number;
  showAccount: boolean;
}

@Component({
  selector: 'app-purchasing-history',
  templateUrl: './purchasing-history.component.html',
  styleUrls: ['./purchasing-history.component.css'],
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
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSortModule,
  ],
})
export class PurchasingHistoryComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();
  private dialog = inject(MatDialog);

  organizationId = this.stateService.getOrganizationId();
  creditPackages: CreditPackage[] = [];
  isLoadingPackages = true;

  orderHistory = new MatTableDataSource<OrderHistory>([]);

  orderDisplayedColumns: string[] = [
    'dateTime',
    'description',
    'paymentMethodUsed',
    'total',
  ];

  constructor(
    private stateService: StateService,
    private creditPackageService: CreditPackageService,
    private paymentInfoService: PaymentInfoService,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService
  ) {}

  ngOnInit(): void {
    this.loadCreditPackages();
    this.loadOrderHistory();
  }

  loadOrderHistory(): void {
    if (this.organizationId !== null) {
      this.paymentInfoService
        .getBillingHistory(this.organizationId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (history) => {
            if (!history || history.length === 0) {
              this.orderHistory.data = [];
              return;
            }

            this.orderHistory.data = history.map((item: any) => {
              const dateString = item.paymentDate.endsWith('Z')
                ? item.paymentDate
                : `${item.paymentDate}Z`;

              const paymentDate = new Date(dateString);

              const dateTimeString = `${paymentDate.toLocaleDateString()}\n${paymentDate.toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}`;

              return {
                dateTime: dateTimeString,
                description: item.paymentPlanDescription,
                paymentMethodUsed: item.paymentMethodDescription || null,
                lastFourNumbers: item.lastFourNumbers || null,
                total: item.paymentAmount,
                showAccount: false,
              };
            });

            this.orderHistory.sortingDataAccessor = (item, property) => {
              const value = (item as any)[property];
              return typeof value === 'string' ? value.toLowerCase() : value;
            };

            setTimeout(() => {
              if (this.paginator) {
                this.orderHistory.paginator = this.paginator;
              }
              if (this.sort) {
                this.orderHistory.sort = this.sort;
              }
            }, 0);
          },
          error: (error) => {
            this.orderHistory.data = [];
            const correlationId = error?.error?.correlationId;
            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                organizationId: this.organizationId,
                correlationId: correlationId,
                methodName: 'loadOrderHistory',
                className: 'PurchasingHistoryComponent',
                operation: 'getBillingHistory',
                userId: this.stateService.getUserId(),
              }
            );
          },
        });
    } else {
      console.error('Organization ID is null. Cannot load billing history.');
      this.orderHistory.data = [];
    }
  }

  loadCreditPackages(): void {
    this.isLoadingPackages = true;

    this.creditPackageService
      .getPaymentPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (packages) => {
          this.creditPackages = packages;
          this.isLoadingPackages = false;
        },
        error: (error) => {
          this.isLoadingPackages = false;
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'loadCreditPackages',
              className: 'PurchasingHistoryComponent',
              operation: 'getPaymentPlans',
              userId: this.stateService.getUserId(),
            }
          );
        },
      });
  }

  onPackageSelectionChange(selectedPackage: CreditPackage): void {
    this.creditPackages.forEach((pkg) => {
      if (pkg.id !== selectedPackage.id) {
        pkg.selected = false;
        pkg.quantity = 0;
      }
    });

    if (selectedPackage.selected) {
      selectedPackage.quantity = 1;
    } else {
      selectedPackage.quantity = 0;
    }
  }

  calculateTotal(): number {
    return this.creditPackages.reduce((total, pkg) => {
      return total + (pkg.selected ? pkg.price * pkg.quantity : 0);
    }, 0);
  }

  onPurchase(): void {
    const selectedPackages = this.creditPackages.filter(
      (pkg) => pkg.selected && pkg.quantity > 0
    );

    if (selectedPackages.length === 0) {
      return;
    }

    const selectedPackage = selectedPackages[0];
    const total = this.calculateTotal();

    const confirmDialogRef = this.dialog.open(PurchaseConfirmationDialog, {
      width: '400px',
      data: {
        packageName: selectedPackage.name,
        credits: selectedPackage.credits,
        total: total,
      },
    });

    confirmDialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed === true) {
        const paymentDialogRef = this.dialog.open(
          CreditPurchaseDialogComponent,
          {
            width: '800px',
            maxHeight: '90vh',
            disableClose: true,
            data: {
              organizationId: this.organizationId,
              selectedPackage: selectedPackage,
              showCreditSelection: false,
            },
          }
        );

        paymentDialogRef.afterClosed().subscribe((result) => {
          if (result?.success) {
            this.creditPackages.forEach((pkg) => {
              pkg.selected = false;
              pkg.quantity = 0;
            });
            this.loadOrderHistory();
            this.snackbarNotificationService.showSnackbarSuccess(
              'Purchase completed successfully.'
            );
          }
        });
      }
    });
  }

  toggleAccountVisibility(order: OrderHistory): void {
    order.showAccount = !order.showAccount;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

@Component({
  selector: 'purchase-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>Confirm Purchase</h2>
    <mat-dialog-content>
      <p>Are you sure you want to purchase:</p>
      <div class="confirmation-details">
        <p>
          <strong>{{ data.packageName }}</strong>
        </p>
        <p>Credits: {{ data.credits }}</p>
        <p>Total: &#36;{{ data.total }}.00</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions style="justify-content: flex-end">
      <button mat-button color="warn" [mat-dialog-close]="false">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [mat-dialog-close]="true"
        cdkFocusInitial
      >
        Confirm
      </button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
})
export class PurchaseConfirmationDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { packageName: string; credits: number; total: number }
  ) {}
}
