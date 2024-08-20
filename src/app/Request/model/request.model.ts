import { Time } from "@angular/common"
import internal from "stream"
import { DecisionMaker } from "./decisionmaker.model"

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
}