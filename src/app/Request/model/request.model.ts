import { Time } from '@angular/common';
import { Category } from './category.model';
import { RequestStatus } from './requeststatus.model';
import { RequestType } from './requesttype.model';

export interface DecisionMakerSelection {
  decisionMakerId: number;
  decisionMakerNumber?: number;
}

export class Request {
  requestId!: null | number;
  requestName!: string;
  requestTypeId!: null | number;
  categoryId!: null | number;
  publishDate!: null | Date;
  publishTime!: null | Time;
  closeDate!: null | Date;
  closeTime!: null | Time;
  contractStart!: null | Date;
  contractEnd!: null | Date;
  decisionMakerSelections?: DecisionMakerSelection[];
  category!: null | Category;
  requestCancelNote!: string | null;
  requestCancelReasonId!: null | number;
  requestStatus!: null | RequestStatus;
  requestStatusId!: null | number;
  requestType!: null | RequestType;
  sourceRequestId?: null | number;
  offerorAuthorizingOfficialId!: null | number;
  organizationId!: number;
  offerorRequestId: any;
  agencyRequestStatusId!: null | number;
}
