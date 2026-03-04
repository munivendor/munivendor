import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrganizationService } from '../../Organization/Details/services/organization.service';
import { Organization } from '../../Organization/Details/model/organization.model';
import { StateService } from '../../Request/services/state.service';
import { OfferorProfileService } from '../../shared/service/offeror-profile.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';
import { AuthorizingOfficialDialogComponent } from './AuthorizingOfficialDialog/authorizing-official-dialog.component';
import { PhonePipe } from '../../shared/pipes/phone.pipe';

export interface AuthorizingOfficial {
  vendorAuthorizingOfficialId?: number;
  organizationId: number;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone?: string | null;
}

@Component({
  selector: 'offeror-profile-page',
  templateUrl: './offeror-profile-page.component.html',
  styleUrls: ['./offeror-profile-page.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    PhonePipe,
  ],
})
export class OfferorProfilePageComponent implements OnInit, AfterViewInit {
  organizationForm!: FormGroup;

  dataSource = new MatTableDataSource<AuthorizingOfficial>([]);
  displayedColumns: string[] = ['name', 'title', 'email', 'phone', 'actions'];

  isLoading = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService,
  ) {}

  ngOnInit(): void {
    this.organizationForm = this.fb.group({
      organizationName: [''],
      address: [''],
      address2: [''],
      city: [''],
      state: [''],
      zipCode: [''],
    });

    const organizationId = this.stateService.getOrganizationId();
    if (organizationId) {
      this.loadOrganization(organizationId);
      this.loadAuthorizingOfficials(organizationId);
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sortingDataAccessor = (
      item: AuthorizingOfficial,
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
          return item.phone ?? '';
        default:
          return '';
      }
    };
  }

  private loadOrganization(organizationId: number): void {
    this.organizationService.getOrganization(organizationId).subscribe({
      next: (org: Organization) => {
        this.organizationForm.patchValue({
          organizationName: org.organizationName,
          address: org.address,
          address2: org.address2,
          city: org.city,
          state: org.state,
          zipCode: org.zipCode,
        });
      },
      error: (error) => {
        const correlationId = error?.error?.correlationId;
        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            organizationId: this.stateService.getOrganizationId(),
            correlationId,
            methodName: 'loadOrganization',
            className: 'OfferorProfilePageComponent',
            operation: 'getOrganization',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  loadAuthorizingOfficials(organizationId: number): void {
    this.isLoading = true;
    this.offerorProfileService
      .GetOfferorAuthorizingOfficials(organizationId)
      .subscribe({
        next: (officials: AuthorizingOfficial[]) => {
          this.dataSource.data = officials;
          this.isLoading = false;
          this.cdr.detectChanges();
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        error: (error) => {
          this.isLoading = false;
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organizationId: this.stateService.getOrganizationId(),
              correlationId,
              methodName: 'loadAuthorizingOfficials',
              className: 'OfferorProfilePageComponent',
              operation: 'GetOfferorAuthorizingOfficials',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  get totalRecords(): number {
    return this.dataSource.data.length;
  }

  openAddDialog(): void {
    const organizationId = this.stateService.getOrganizationId();
    if (!organizationId) return;

    const dialogRef = this.dialog.open(AuthorizingOfficialDialogComponent, {
      data: {
        isEditMode: false,
        formData: this.emptyOfficialForm(organizationId),
        organizationId,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((success: boolean | null) => {
      if (success) this.loadAuthorizingOfficials(organizationId);
    });
  }

  openEditDialog(official: AuthorizingOfficial): void {
    const organizationId = this.stateService.getOrganizationId();
    if (!organizationId) return;

    const dialogRef = this.dialog.open(AuthorizingOfficialDialogComponent, {
      data: {
        isEditMode: true,
        formData: { ...official },
        organizationId,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((success: boolean | null) => {
      if (success) this.loadAuthorizingOfficials(organizationId);
    });
  }

  // onDeleteOfficial(official: AuthorizingOfficial): void {
  //   const dialogData: ConfirmDialogData = {
  //     title: 'Remove Authorizing Official',
  //     message:
  //       'Are you sure you want to remove this authorizing official? This action cannot be undone.',
  //     confirmLabel: 'Remove',
  //     cancelLabel: 'Cancel',
  //     confirmColor: 'warn',
  //   };

  //   const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  //     data: dialogData,
  //     width: '400px',
  //     disableClose: true,
  //   });

  //   dialogRef.afterClosed().subscribe((confirmed: boolean) => {
  //     if (!confirmed) return;

  //     this.offerorProfileService
  //       .DeleteOfferorAuthorizingOfficial(
  //         official.vendorAuthorizingOfficialId!,
  //       )
  //       .subscribe({
  //         next: () => {
  //           this.dataSource.data = this.dataSource.data.filter(
  //             (o) =>
  //               o.vendorAuthorizingOfficialId !==
  //               official.vendorAuthorizingOfficialId,
  //           );
  //           this.snackbarNotificationService.showSnackbarSuccess(
  //             'Authorizing official removed successfully.',
  //           );
  //         },
  //         error: () => {
  //           this.snackbarNotificationService.showSnackbarError(
  //             'Failed to remove authorizing official.',
  //           );
  //         },
  //       });
  //   });
  // }

  private emptyOfficialForm(
    organizationId: number,
  ): Omit<AuthorizingOfficial, 'vendorAuthorizingOfficialId'> {
    return {
      organizationId,
      firstName: '',
      lastName: '',
      title: '',
      email: '',
      phone: null,
    };
  }
}
