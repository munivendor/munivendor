import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialog } from '../RequestConfirmationDialog/confirmation-dialog.component';
import { RequestService } from '../services/request.service';
import { Request } from '../model/request.model';

@Component({
  selector: 'request-tabledetails',
  standalone: true,
  templateUrl: './request-tabledetails.component.html',
  styleUrls: ['./request-tabledetails.component.css'],
  imports: [CommonModule, ConfirmationDialog]
})
export class TableDetailsComponent implements OnInit {
  joinedRequestData: Request[] = [];

  constructor(public dialog: MatDialog, private requestService: RequestService) { }

  ngOnInit(): void {
    this.getRequestObjDetails();
  }

  getRequestObjDetails() {
    const requests$ = this.requestService.GetRequests();
    const categories$ = this.requestService.GetCategories();
    const requestTypes$ = this.requestService.GetRequestTypes();
    const requestStatuses$ = this.requestService.GetRequestStatuses();

    const combinedData: any[] = [];

    forkJoin([requests$, categories$, requestTypes$, requestStatuses$]).subscribe(
      ([requests, categories, requestTypes, requestStatuses]) => {
        requests.forEach((request: { categoryId: any; requestTypeId: number; requestStatusId: any; }) => {
          const category = categories.find((c: { categoryId: any; }) => c.categoryId === request.categoryId);
          const requestType = requestTypes.find(r => r.requestTypeId === request.requestTypeId);
          const requestStatus = requestStatuses.find((rs: { requestStatusId: any; }) => rs.requestStatusId === request.requestStatusId);
          combinedData.push({
            ...request,
            category,
            requestType,
            requestStatus
          });
        });
        this.joinedRequestData.push(...combinedData);
      },
      error => {
        console.error('Error fetching data', error);
      }
    );
  }

  canDelete(joinedRequest: any): boolean {
    return joinedRequest.requestStatus?.requestStatusDesc === 'Draft';
  }

  canEdit(joinedRequest: any): boolean {
    return joinedRequest.requestStatus?.requestStatusDesc === 'Draft' || joinedRequest.requestStatus?.requestStatusDesc === 'Live';
  }

  canCancel(joinedRequest: any): boolean {
    return joinedRequest.requestStatus?.requestStatusDesc === 'Scheduled' || joinedRequest.requestStatus?.requestStatusDesc === 'Live';
  }

  openConfirmationDialog(action: string, request: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '600px',
      data: { action, request }
    });

    dialogRef.componentInstance.onCancelUpdateRequestStatus = this.onCancelUpdateRequestStatus.bind(this);

    dialogRef.componentInstance.cancellationRequested.subscribe((cancelData: { request: any, action: string, reasonId: number, reasonNote: string }) => {
      this.onCancelUpdateRequestCancelReason(cancelData.request, cancelData.reasonId, cancelData.reasonNote);
      this.onCancelUpdateRequestStatus(cancelData.request, cancelData.action);
    });
  

    dialogRef.afterClosed().subscribe(result => {
      if (result && action === "delete") {
        this.deleteRequest(request);
      }
      // if (result && action === "edit") {
      //   this.editRequest(request, action);
      // }
    });
  }


  deleteRequest(request: any): void {
    this.requestService.DeleteRequest(request.requestId).subscribe(
      () => {
        console.log(`Request with ID ${request.requestId} deleted successfully.`);
        this.joinedRequestData = this.joinedRequestData.filter(i => i.requestId !== request.requestId);
      },
      error => {
        console.error('Error deleting the request:', error);
      }
    );
  }

  onCancelUpdateRequestStatus(request: any, action: string): void {
    console.log("request", request)
    const DRAFT_STATUS_ID = 1;
    const CANCELLED_STATUS_ID = 5;
    
    if (action === "cancel") {
      const statusDesc = request.requestStatus.requestStatusDesc;
      let newRequestStatusId: number;
      let newRequestStatusDesc: string

      if (statusDesc === "Scheduled") {
        newRequestStatusId = DRAFT_STATUS_ID;
        newRequestStatusDesc = "Draft"
      } else if (statusDesc === "Live") {
        newRequestStatusId = CANCELLED_STATUS_ID;
        newRequestStatusDesc = "Cancelled"
      } else {
        console.warn("Unexpected request status:", statusDesc);
        return;
      }

      this.requestService.UpdateRequestStatus(request.requestId, newRequestStatusId).subscribe(
        () => {
          console.log("Request status updated successfully");
          this.joinedRequestData = this.joinedRequestData.map((i) => {
            if (i.requestId === request.requestId) {
                return {
                    ...i,
                    requestStatus: {
                        ...i.requestStatus,
                        requestStatusId: newRequestStatusId,
                        requestStatusDesc: newRequestStatusDesc,
                    },
                };
            }
            return i;
        });
        },
        (error) => {
          console.error("Error updating request status:", error);
        }
      );
    }
  }

  onCancelUpdateRequestCancelReason(request: any, reasonId: number, reasonNote: string): void {
    this.requestService.UpdateRequestCancelReason(request.requestId, reasonId, reasonNote).subscribe(
      () => {
        console.log(`Request with ID ${request.requestId} updated successfully with cancel reason ID ${reasonId}.`);
      },
      error => {
        console.error('Error updating the request:', error);
      }
    );
  }

  // editRequest(request: any, action: string): void {
  //   // Define the updated request data based on the action
  //   let updatedData: any;

  //   if (action === 'edit') {
  //     // Example: Editing request (you can modify the fields as per your requirements)
  //     updatedData = { ...request, requestName: 'Updated Request Name' }; // Modify requestName or other fields
  //   }

  //   this.http.put(`${this.url}/api/requests/${request.requestId}`, updatedData).subscribe(
  //     (updatedItem) => {
  //       console.log(`Request with ID ${request.requestId} updated successfully.`);
  //       // Update the table with the updated request
  //       this.joinedRequestData = this.joinedRequestData.map(i => i.requestId === request.requestId ? updatedItem : i);
  //     },
  //     error => {
  //       console.error('Error updating the request:', error);
  //     }
  //   );
  // }
}
