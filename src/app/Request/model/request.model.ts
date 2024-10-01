import { Time } from "@angular/common"
import internal from "stream"
import { DecisionMaker } from "./decisionmaker.model"
import { Category } from "./category.model"
import { RequestStatus } from "./requeststatus.model"
import { RequestType } from "./requesttype.model"

export class Request
    {
        requestId!: number
        requestName!: string
        requestTypeId!: number
        categoryId!: number
        subcategoryId!: number
        publishDate!: Date
        publishTime!:Time
        openDate!: Date
        openTime!: Time
        contractStart!: Date
        contractEnd!: Date    
        decisionMakerSelections!: any [] 
        category!: Category;
        RequestCancelNote!: string | null;
        requestCancelReasonId!: number;
        requestStatus!: RequestStatus;
        requestStatusId!: number;
        requestType!: RequestType;
}