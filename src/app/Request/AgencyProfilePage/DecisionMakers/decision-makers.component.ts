import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { AgencyProfileService } from '../../services/agency-profile.service';
import { StateService } from '../../../Request/services/state.service';
import { DecisionMaker } from '../../model/decisionmaker.model';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { PhonePipe } from '../../../shared/pipes/phone.pipe';
import { DecisionMakerDialogComponent } from './DecisionMakerDialog/decision-maker-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/ConfirmDialog/confirm-dialog.component';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-decision-makers',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    PhonePipe,
    MatProgressSpinnerModule,
  ],
  templateUrl: './decision-makers.component.html',
  styleUrls: ['./decision-makers.component.css'],
})
export class DecisionMakersComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<DecisionMaker>([]);
  displayedColumns = [
    'name',
    'title',
    'email',
    'phone',
    'emailSolicitations',
    'actions',
  ];

  isLoading = false;
  @Input() organizationId: number | null = null;
  //   organizationId = this.stateService.getOrganizationId();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private agencyProfileService: AgencyProfileService,
    private dialog: MatDialog,
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private snackbar: SnackbarNotificationService,
    private loggingService: LoggingService,
  ) {}

  ngOnInit(): void {
    this.loadAgencyDecisionMakers();
  }

  ngAfterViewInit(): void {
    this.dataSource.sortingDataAccessor = (
      item: DecisionMaker,
      property: string,
    ) => {
      switch (property) {
        case 'name':
          return `${item.firstName} ${item.lastName}`.toLowerCase();
        case 'title':
          return item.title?.toLowerCase() ?? '';
        case 'email':
          return item.email?.toLowerCase() ?? '';
        case 'phone':
          return item.phoneNumber ?? '';
        case 'emailSolicitations':
          return item.emailSolicitations === true
            ? 'yes'
            : item.emailSolicitations === false
              ? 'no'
              : '';
        default:
          return '';
      }
    };
  }

  loadAgencyDecisionMakers(): void {
    this.isLoading = true;

    this.agencyProfileService
      .GetAgencyDecisionMakers(this.organizationId ?? 0)
      .subscribe({
        next: (data) => {
          this.dataSource.data = data;
          this.isLoading = false;
          this.cdr.detectChanges();
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        error: (err) => {
          this.isLoading = false;
          const correlationId = err.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              correlationId,
              methodName: 'loadAgencyDecisionMakers',
              className: 'AgencyProfilePageComponent',
              operation: 'GetAgencyDecisionMakers',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  get totalRecords(): number {
    return this.dataSource.data.length;
  }

  openAddDecisionMakerDialog(): void {
    const dialogRef = this.dialog.open(DecisionMakerDialogComponent, {
      data: {
        isEditMode: false,
        formData: this.emptyDecisionMakerForm(),
        organizationId: this.organizationId ?? 0,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((success: boolean | null) => {
      if (success) this.loadAgencyDecisionMakers();
    });
  }

  openEditDecisionMakerDialog(dm: DecisionMaker): void {
    const formData: DecisionMaker = {
      decisionMakerId: dm.decisionMakerId,
      firstName: dm.firstName ?? '',
      lastName: dm.lastName ?? '',
      email: dm.email ?? '',
      phoneNumber: dm.phoneNumber ?? null,
      title: dm.title ?? null,
      emailSolicitations: dm.emailSolicitations ?? null,
    };

    const dialogRef = this.dialog.open(DecisionMakerDialogComponent, {
      data: {
        isEditMode: true,
        formData,
        organizationId: this.organizationId ?? 0,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((success: boolean | null) => {
      if (success) this.loadAgencyDecisionMakers();
    });
  }

  onDeleteAgencyDecisionMaker(
    decisionMakerId: number,
    organizationId: number,
    event: MouseEvent, //
  ): void {
    // Blur the button immediately so it doesn't retain focus/active state
    (event.currentTarget as HTMLElement).blur();
    const dialogData: ConfirmDialogData = {
      title: 'Remove Decision Maker',
      message:
        'Are you sure you want to remove this decision maker? This action cannot be undone.',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      confirmColor: 'warn',
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      width: '400px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.agencyProfileService
        .DeleteAgencyDecisionMaker(decisionMakerId, organizationId)
        .subscribe({
          next: () => {
            this.dataSource.data = this.dataSource.data.filter(
              (dm) => dm.decisionMakerId !== decisionMakerId,
            );
            this.snackbar.showSnackbarSuccess(
              'Decision maker removed successfully.',
            );
          },
          error: (err) => {
            this.snackbar.showSnackbarError('Failed to remove decision maker.');
            const correlationId = err.error?.correlationId;
            this.loggingService.logException(
              new Error(`HTTP Error ${err.status}: ${err.statusText}`),
              3,
              {
                organizationId: this.organizationId,
                correlationId,
                methodName: 'onDeleteAgencyDecisionMaker',
                className: 'AgencyProfilePageComponent',
                operation: 'DeleteAgencyDecisionMaker',
                userId: this.stateService.getUserId(),
              },
            );
          },
        });
    });
  }

  getDecisionMakerInitials(firstName: string, lastName: string): string {
    const parts = firstName.trim().split(' ');
    const first = parts[0]?.charAt(0) ?? '';
    const last = lastName.trim().charAt(0) ?? '';
    return (parts.length > 1 ? first + last : first).toUpperCase();
  }

  private emptyDecisionMakerForm(): Omit<DecisionMaker, 'decisionMakerId'> {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: null,
      title: null,
      emailSolicitations: null,
    };
  }
}
