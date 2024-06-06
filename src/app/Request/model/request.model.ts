import { Time } from "@angular/common"

export class Request
    {
        requestId!: number
        requestName!: string
        publishDate!: Date 
        publishTime!:Time
        openDate!: Date
        openTime!: Time
        contractStart!: Date
        contractEnd!: Date     
}