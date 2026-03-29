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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PhonePipe } from '../../../shared/pipes/phone.pipe';
import { StateService } from '../../../Request/services/state.service';
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { AuthorizingOfficialDialogComponent } from '../AuthorizingOfficials/AuthorizingOfficialDialog/authorizing-official-dialog.component';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';

export interface AuthorizingOfficial {
  offerorAuthorizingOfficialId?: number;
  organizationId: number;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone?: string | null;
}

@Component({
  selector: 'app-authorizing-officials',
  templateUrl: './authorizing-officials.component.html',
  styleUrls: ['./authorizing-officials.component.css'],
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
    MatProgressSpinnerModule,
    PhonePipe,
  ],
})
export class AuthorizingOfficialsComponent implements OnInit, AfterViewInit {
  organizationForm!: FormGroup;

  dataSource = new MatTableDataSource<AuthorizingOfficial>([]);
  displayedColumns: string[] = ['name', 'title', 'email', 'phone', 'actions'];

  isLoading = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
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
      autoFocus: false,
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

  private emptyOfficialForm(
    organizationId: number,
  ): Omit<AuthorizingOfficial, 'offerorAuthorizingOfficialId'> {
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
