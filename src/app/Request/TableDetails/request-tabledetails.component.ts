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
    const requests$ = this.http.get<any[]>(this.url + '/GetRequestsAsync');
    const categories$ = this.http.get<any[]>(this.url + '/GetCategories');
    const requestTypes$ = this.http.get<any[]>(this.url + '/GetRequestTypes');
    const requestStatuses$ = this.http.get<any[]>(this.url + '/GetRequestStatusesAsync');

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
      width: '250px',
      data: { action, item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && action === "delete") {
        this.deleteRequest(item, action);
      }
      if (result && action === "cancel") {
        this.cancelRequest(item, action);
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
        // Correctly update the table after deletion
        this.items = this.items.filter(i => i.requestId !== item.requestId);
      },
      error => {
        console.error('Error deleting the request:', error);
      }
    );
  }

  cancelRequest(item: any, action: string): void {
    // Define the updated request data based on the action
    let updatedData: any;
  
    // Handle cancelation logic based on the request status
  if (action === "cancel") {
    if (item.requestStatus.requestStatusDesc === "Scheduled") {
      updatedData = { ...item, requestStatusId: 1 }; // Set status to 'Draft'
    } else if (item.requestStatus.requestStatusDesc === "Live") {
      updatedData = { ...item, requestStatusId: 3 }; // Set status to 'Cancelled' (assuming 3 is Cancelled)
    } 
  }

    this.http.put(`${this.url}/api/requests/${item.requestId}`, updatedData).subscribe(
      () => {
        console.log(`Request with ID ${item.requestId} canceled successfully.`);

        // Update the request status in the items array without removing the item
        const index = this.items.findIndex(i => i.requestId === item.requestId);
        if (index !== -1) {
          this.items[index] = { ...this.items[index], requestStatusId: updatedData.requestStatusId };
        }
      },
      error => {
        console.error('Error canceling the request:', error);
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
