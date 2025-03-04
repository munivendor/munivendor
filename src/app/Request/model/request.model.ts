import { Time } from "@angular/common"
import { Category } from "./category.model"
import { RequestStatus } from "./requeststatus.model"
import { RequestType } from "./requesttype.model"

export interface DecisionMakerSelection {
    decisionMakerId: number;
    decisionMakerNumber?: number;
  }

export class Request
    {
        requestId?: number|undefined;
        soureceRequestId?: number |undefined;
        requestName?: string |undefined;
        requestTypeId?: number |undefined;
        categoryId?: number |undefined;
        subcategoryId?: number |undefined;
        publishDate?: Date|undefined;
        publishTime?:Time|undefined;
        openDate?: Date|undefined;
        openTime?: Time|undefined;
        contractStart?: Date|undefined;
        contractEnd?: Date |undefined; 
        decisionMakerSelections?: DecisionMakerSelection[] |undefined;
        category?: Category|undefined;
        RequestCancelNote?: string | undefined;
        requestCancelReasonId?: number|undefined;
        requestStatus?: RequestStatus|undefined;
        requestStatusId?: number|undefined;
        requestType?: RequestType|undefined;
}