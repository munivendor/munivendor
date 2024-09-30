import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialog } from '../RequestConfirmationDialog/confirmation-dialog.component';
import { RequestService } from '../services/request.service';

@Component({
  selector: 'request-tabledetails',
  standalone: true,
  templateUrl: './request-tabledetails.component.html',
  styleUrls: ['./request-tabledetails.component.css'],
  imports: [CommonModule, ConfirmationDialog]
})
export class TableDetailsComponent implements OnInit {
  private url = "https://localhost:7135";
  items: any[] = [];

  constructor(private http: HttpClient, public dialog: MatDialog, private requestService: RequestService) { }

  ngOnInit(): void {
    this.getData();
  }

  getData() {
    const requests$ = this.http.get<any[]>(this.url + '/GetRequests');
    const categories$ = this.http.get<any[]>(this.url + '/GetCategories');
    const requestTypes$ = this.http.get<any[]>(this.url + '/GetRequestTypes');
    const requestStatuses$ = this.http.get<any[]>(this.url + '/GetRequestStatuses');

    const combinedData: any[] = [];

    forkJoin([requests$, categories$, requestTypes$, requestStatuses$]).subscribe(
      ([requests, categories, requestTypes, requestStatuses]) => {
        requests.forEach((request) => {
          const category = categories.find((c) => c.categoryId === request.categoryId);
          const requestType = requestTypes.find(r => r.requestTypeId === request.requestTypeId);
          const requestStatus = requestStatuses.find(rs => rs.requestStatusId === request.requestStatusId);
          combinedData.push({
            ...request,
            category,
            requestType,
            requestStatus
          });
        });
        this.items.push(...combinedData);
      },
      error => {
        console.error('Error fetching data', error);
      }
    );
  }

  canDelete(item: any): boolean {
    return item.requestStatus?.requestStatusDesc === 'Draft';
  }

  canEdit(item: any): boolean {
    return item.requestStatus?.requestStatusDesc === 'Draft' || item.requestStatus?.requestStatusDesc === 'Live';
  }

  canCancel(item: any): boolean {
    return item.requestStatus?.requestStatusDesc === 'Scheduled' || item.requestStatus?.requestStatusDesc === 'Live';
  }

  openConfirmationDialog(action: string, item: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '600px',
      data: { action, item }
    });

    dialogRef.componentInstance.cancellationRequested.subscribe((cancelData: { item: any, action: string, value: any, otherNote: string }) => {
      this.onCancelUpdateRequestCancelReason(cancelData.item, cancelData.value, cancelData.otherNote);
      this.onCancelUpdateRequestStatus(cancelData.item, cancelData.action);
      
    });
  

    dialogRef.afterClosed().subscribe(result => {
      if (result && action === "delete") {
        this.deleteRequest(item, action);
      }
      if (result && action === "edit") {
        this.editRequest(item, action);
      }
    });
  }


  deleteRequest(item: any, action: string): void {
    this.requestService.DeleteRequest(item.requestId).subscribe(
      () => {
        console.log(`Request with ID ${item.requestId} deleted successfully.`);
        this.items = this.items.filter(i => i.requestId !== item.requestId);
      },
      error => {
        console.error('Error deleting the request:', error);
      }
    );
  }

  onCancelUpdateRequestStatus(item: any, action: string): void {
    const DRAFT_STATUS_ID = 1;
    const CANCELLED_STATUS_ID = 5;
    
    if (action === "cancel") {
      const statusDesc = item.requestStatus.requestStatusDesc;
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

      this.requestService.UpdateRequestStatus(item.requestId, newRequestStatusId).subscribe(
        () => {
          console.log("Request status updated successfully");
          this.items = this.items.map((i) => {
            if (i.requestId === item.requestId) {
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

  onCancelUpdateRequestCancelReason(item: any, value: any, otherNote: string): void {
    this.requestService.UpdateRequestCancelReason(item.requestId, value, otherNote).subscribe(
      () => {
        console.log(`Request with ID ${item.requestId} updated successfully with cancel reason ID ${value}.`);
      },
      error => {
        console.error('Error updating the request:', error);
      }
    );
  }

  editRequest(item: any, action: string): void {
    // Define the updated request data based on the action
    let updatedData: any;

    if (action === 'edit') {
      // Example: Editing request (you can modify the fields as per your requirements)
      updatedData = { ...item, requestName: 'Updated Request Name' }; // Modify requestName or other fields
    }

    this.http.put(`${this.url}/api/requests/${item.requestId}`, updatedData).subscribe(
      (updatedItem) => {
        console.log(`Request with ID ${item.requestId} updated successfully.`);
        // Update the table with the updated item
        this.items = this.items.map(i => i.requestId === item.requestId ? updatedItem : i);
      },
      error => {
        console.error('Error updating the request:', error);
      }
    );
  }
}
