import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'request-tabledetails',
  standalone: true,
  templateUrl: './request-tabledetails.component.html',
  styleUrls: ['./request-tabledetails.component.css'],
  imports: [CommonModule]
})
export class TableDetailsComponent implements OnInit {

  private url = "https://localhost:7135";
  items: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
   this.getData();
  }

  getData(){
    const requests$ = this.http.get<any[]>(this.url + '/GetRequests');
    const categories$ = this.http.get<any[]>(this.url + '/GetCategories');
    const requestTypes$ = this.http.get<any[]>(this.url + '/GetRequestTypes');
    const requestStates$ = this.http.get<any[]>(this.url + '/GetRequestStates');
  
    const combinedData: any[] = [];

    forkJoin([requests$, categories$, requestTypes$, requestStates$]).subscribe(
      ([requests, categories, requestTypes, requestStates]) => {
        // Process combined results here
        const combinedResults = {
          requests,
          categories,
          requestTypes
        };
        console.log(combinedResults);
        requests.forEach((request) => {
          const category = categories.find((c) => c.categoryId === request.categoryId);
          const requestType = requestTypes.find(r => r.requestTypeId === request.requestTypeId);
          const requestState = requestStates.find(rs => rs.requestStateId === request.requestStateId);
          combinedData.push({
            ...request,
            category,
            requestType,
            requestState
          });
        })
        console.log("combinedData", combinedData)
        this.items.push(...combinedData);
      },
     
      error => {
        console.error('Error fetching data', error);
      }
    );
   
  }

  canEdit(item: any): boolean {
    if (item.requestState && item.requestState.requestStatus) {
      return item.requestState.requestStatus === 'Draft' || item.requestState.requestStatus === 'Live';
    }
    return false;
  }

  canDelete(item: any): boolean {
    if (item.requestState && item.requestState.requestStatus) {
      return item.requestState.requestStatus === 'Draft';
    }
    return false;
  }

  canCancel(item: any): boolean {
    if (item.requestState && item.requestState.requestStatus) {
      return item.requestState.requestStatus === 'Scheduled' || item.requestState.requestStatus === 'Live';
    }
    return false;
  }
  
  performAction(item: any, action: string) {
    console.log(`${action} action performed on`, item);
  }
}
