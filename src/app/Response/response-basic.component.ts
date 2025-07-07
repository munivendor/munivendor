import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RequestService } from '../Request/services/request.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CategoryHierarchyService } from '../Request/services/category-hierarchy.service'
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { OfferorProfileService } from '../shared/service/offeror-profile.service';
import { Response } from '../shared/model/response.model';
import { StateService } from '../Request/services/state.service';
import { TooltipDirective } from '../shared/directive/tooltip.directive';

@Component({
  selector: 'response-basic',
  templateUrl: './response-basic.component.html',
  styleUrls: ['./response-basic.component.css'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    TooltipDirective
  ],
  providers: [RequestService]
})

export class ResponseBasicComponent implements OnInit {
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  @Input() sourceIdParam?: string | null | undefined;
  @Input() requestId?: number;
  @Output() formValidityChange = new EventEmitter<boolean>();
  @Input() isEditMode = false;
  @Input() responseIdParam?: string | undefined | null;
  requestForm!: FormGroup;
  request: Response | undefined
  responseForm: FormGroup;
  private destroy$ = new Subject<void>();
  authorizingOfficialId: number | null = null;
  organizationId = this.stateService.getOrganizationId();
  responseIdFromStateService = this.stateService.getRequestId();

  constructor(
    private requestService: RequestService,
    private fb: FormBuilder,
    private categoryHierarchyService: CategoryHierarchyService,
    private router: Router,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
  ) {
    this.responseForm = this.fb.group({
      responseName: ['', Validators.required],
      authorizingOfficial: [{ value: '', disabled: true }, Validators.required],
    });
  }

  private fetchAuthorizingOfficials(): void {
    this.offerorProfileService.GetOfferorAuthorizingOfficials(Number(this.organizationId))
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (officials) => {
          this.authorizingOfficialId = officials?.[0].vendorAuthorizingOfficialId || null;
          if (officials) {
            this.responseForm.patchValue({ authorizingOfficial: officials[0].firstName + ' ' + officials[0].lastName });
          }
          console.log('Response form after patching:', this.responseForm.value);
        },
        (error) => {
          console.error('Error fetching authorizing officials:', error);
        }
      );
  }

  ngOnInit(): void {
    if (this.sourceIdParam) {
      this.loadTemplateRequest(Number(this.sourceIdParam));
      this.fetchAuthorizingOfficials();
    }

    if (this.responseIdParam) {
      this.loadResponseRequest(Number(this.responseIdParam));
    } else if (this.responseIdFromStateService) {
      this.loadResponseRequest(this.responseIdFromStateService);
    }

    this.responseForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formValidityChange.emit(this.responseForm.valid);
      });

    this.formValidityChange.emit(this.responseForm.valid);
  }

  private loadTemplateRequest(requestId: number): void {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const categories$ = this.categoryHierarchyService.GetCategoryHierarchy();
    const requestTypes$ = this.requestService.GetRequestTypes();

    forkJoin([request$, categories$, requestTypes$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([request, categories, requestTypes]) => {
          const category = this.findCategoryById(categories, request.categoryId);
          const requestType = requestTypes.find((r: { requestTypeId: number }) => r.requestTypeId === request.requestTypeId);

          this.requestForm = this.fb.group({
            requestName: [{ value: request?.requestName, disabled: true }],
            requestCategory: [{ value: category?.categoryName || category?.name, disabled: true }],
            requestType: [{ value: requestType?.requestTypeDesc, disabled: true }],
            publishDateAndTime: [{ value: this.formatDateTime(request.publishDate), disabled: true }],
            publishDate: [{ value: request.publishDate, disabled: true }],
            publishTime: [{ value: this.convertUtcToLocalTimeOnly(request.publishDate), disabled: true }],
            openDateAndTime: [{ value: this.formatDateTime(request.openDate), disabled: true }],
            openDate: [{ value: request.openDate, disabled: true }],
            openTime: [{ value: this.convertUtcToLocalTimeOnly(request.openDate), disabled: true }],
            contractStartDate: [{ value: this.getDateOnly(request.contractStart), disabled: true }],
            contractEndDate: [{ value: this.getDateOnly(request.contractEnd), disabled: true }],
          });
        },
        (error: any) => {
          console.error('Error loading template request', error);
        }
      );
  }

  private getDateOnly(dateTimeString: string): string {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US');
  }

  private loadResponseRequest(responseId: number): void {
    const request$ = this.requestService.GetRequestDetailsById(responseId);
    const authorizingOfficials$ = this.offerorProfileService.GetOfferorAuthorizingOfficials(Number(this.organizationId));
    forkJoin([request$, authorizingOfficials$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([response, authorizingOfficials]) => {
          const authorizingOfficial = authorizingOfficials.find(
            (official: { vendorAuthorizingOfficialId: number }) =>
              official.vendorAuthorizingOfficialId === response.authorizingOfficialId
          );

          this.responseForm.patchValue({
            responseName: response.requestName,
            authorizingOfficial: authorizingOfficial ?
              `${authorizingOfficial.firstName} ${authorizingOfficial.lastName}` : ''
          });
        },
        (error: any) => {
          console.error('Error loading response request', error);
        }
      );
  }

  private findCategoryById(categories: any[], targetId: number): any {
    for (const category of categories) {
      if (category.id === targetId) {
        return category;
      }

      if (category.children && category.children.length > 0) {
        const found = this.findCategoryById(category.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  private formatDateTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US');
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${formattedDate} at ${formattedTime}`;
  }

  private convertUtcToLocalTimeOnly(utcDateTime: string): string {
    if (!utcDateTime) return '';
    const utcDate = new Date(utcDateTime + 'Z');
    if (isNaN(utcDate.getTime())) return '';
    const localTime = utcDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return localTime;
  }

  saveResponse(): void {
    if (this.responseForm.invalid) {
      return;
    }

    const sourceRequestId = this.sourceIdParam;
    const responseName = this.responseForm.value.responseName;
    const request: Response = {
      requestName: responseName,
      requestTypeId: 4,
      sourceRequestId: +(sourceRequestId ?? 0),
      authorizingOfficialId: this.authorizingOfficialId,
      organizationId: this.organizationId,
    };

    if (this.responseIdFromStateService || this.responseIdParam) {
      const requestId = this.responseIdFromStateService || Number(this.responseIdParam);
      this.requestService.UpdateRequest(Number(requestId), request)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (responseRequestId: number) => {
            console.log('Request updated successfully:', responseRequestId);
            this.stateService.setRequestId(responseRequestId);
            this.stateService.setRequestHasBeenSaved(true);
          },
          error => {
            console.error('Error updating Request:', error);
          }
        );
    }
    else if (!this.responseIdFromStateService || !this.responseIdParam) {
      this.requestService.CreateRequest(request).subscribe(
        (response) => {
          console.log('Response saved successfully:', response);
          this.stateService.setRequestId(response);
        },
        (error) => {
          console.error('Error saving response:', error);
        }
      );
    }

  }

  goToOfferorProfilePage() {
    this.router.navigate(['/offeror-profile']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}