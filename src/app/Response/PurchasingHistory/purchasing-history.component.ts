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

interface CreditPackage {
  id: number;
  name: string;
  credits: number;
  price: number;
  discount?: string;
  selected: boolean;
  quantity: number;
}

interface OrderHistory {
  date: string;
  time: string;
  items: string[];
  lastFourDigits: string;
  total: number;
  showAccount: boolean;
}

interface CreditUsage {
  date: string;
  time: string;
  submissionId: string;
  creditsUsed: number;
  remainingBalance: number;
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
  ],
})
export class PurchasingHistoryComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private destroy$ = new Subject<void>();

  creditPackages: CreditPackage[] = [
    {
      id: 1,
      name: '1 Submission Credit',
      credits: 1,
      price: 49,
      selected: false,
      quantity: 0,
    },
    {
      id: 2,
      name: '5 Submission Credits',
      credits: 5,
      price: 232,
      discount: 'Over 5% Off!',
      selected: false,
      quantity: 0,
    },
    {
      id: 3,
      name: '10 Submission Credits',
      credits: 10,
      price: 440,
      discount: 'Over 10% Off!',
      selected: false,
      quantity: 0,
    },
    {
      id: 4,
      name: '15 Submission Credits',
      credits: 15,
      price: 624,
      discount: 'Over 15% Off!',
      selected: false,
      quantity: 0,
    },
  ];

  orderHistory = new MatTableDataSource<OrderHistory>([
    {
      date: '10/1/2025',
      time: '10:10 AM',
      items: ['1 Submission Credit'],
      lastFourDigits: '1234',
      total: 49,
      showAccount: false,
    },
    {
      date: '10/15/2025',
      time: '11:00 AM',
      items: ['5 Submission Credits'],
      lastFourDigits: '5678',
      total: 232,
      showAccount: false,
    },
    {
      date: '11/20/2025',
      time: '11:05 AM',
      items: ['1 Submission Credit'],
      lastFourDigits: '9012',
      total: 49,
      showAccount: false,
    },
    {
      date: '11/29/2025',
      time: '10:30 AM',
      items: ['15 Submission Credits'],
      lastFourDigits: '3456',
      total: 624,
      showAccount: false,
    },
    {
      date: '12/10/2025',
      time: '12:15 PM',
      items: ['10 Submission Credits'],
      lastFourDigits: '7890',
      total: 440,
      showAccount: false,
    },
  ]);

  creditUsage = new MatTableDataSource<CreditUsage>([
    {
      date: '10/2/2025',
      time: '2:30 PM',
      submissionId: 'SUB-2025-001',
      creditsUsed: 1,
      remainingBalance: 14,
    },
    {
      date: '10/16/2025',
      time: '9:45 AM',
      submissionId: 'SUB-2025-002',
      creditsUsed: 1,
      remainingBalance: 28,
    },
    {
      date: '10/18/2025',
      time: '3:15 PM',
      submissionId: 'SUB-2025-003',
      creditsUsed: 1,
      remainingBalance: 27,
    },
    {
      date: '11/21/2025',
      time: '11:30 AM',
      submissionId: 'SUB-2025-004',
      creditsUsed: 1,
      remainingBalance: 27,
    },
    {
      date: '11/30/2025',
      time: '4:20 PM',
      submissionId: 'SUB-2025-005',
      creditsUsed: 1,
      remainingBalance: 41,
    },
    {
      date: '12/11/2025',
      time: '1:10 PM',
      submissionId: 'SUB-2025-006',
      creditsUsed: 1,
      remainingBalance: 35,
    },
  ]);

  orderDisplayedColumns: string[] = [
    'date',
    'time',
    'quantity',
    'lastFourDigits',
    'total',
  ];
  usageDisplayedColumns: string[] = [
    'date',
    'time',
    'submissionId',
    'creditsUsed',
    'remainingBalance',
  ];

  constructor() {}

  ngOnInit(): void {
    setTimeout(() => {
      this.orderHistory.paginator = this.paginator;
      this.creditUsage.paginator = this.paginator;
    });
  }

  onPackageSelectionChange(selectedPackage: CreditPackage): void {
    console.log('Package selection changed:', selectedPackage);
    if (selectedPackage.selected && selectedPackage.quantity === 0) {
      selectedPackage.quantity = 1;
    } else if (!selectedPackage.selected) {
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
      console.log('No packages selected');
      return;
    }

    // TODO: Implement actual purchase logic with API call
    // this.purchasingService.purchaseCredits(selectedPackages).subscribe(...)

    // Reset selections after purchase
    this.creditPackages.forEach((pkg) => {
      pkg.selected = false;
      pkg.quantity = 0;
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
