import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../model/category.model';
import { SubCategory } from '../model/subcategory.model';
import { DecisionMaker } from '../model/decisionmakers.model';



@Injectable({
  providedIn: 'root'
})
export class RequestService {
  
  constructor(private http: HttpClient) {}

      loadRequests (): Observable<any> 
      {
        const url = 'http://127.0.0.1:5084/requestors';
        return this.http.get<any>(url);
      }
      
      getCategories(): Observable<Category []>  {
        const url = 'http://127.0.0.1:5084/requestors';
        return this.http.get<Category []>(url);
      }

      GetSubcategories(categoryId: number): Observable<SubCategory []>  {
        const url = 'http://127.0.0.1:5084/requestors';
        return this.http.get<SubCategory []>(url);
        
      }
      GetDecisionMakers(): Observable<DecisionMaker []>  {
        const url = 'http://127.0.0.1:5084/requestors';
        return this.http.get<any>(DecisionMaker []);
      }

      GetRequestTypes(): Observable<RequestType>  {
        const url = 'http://127.0.0.1:5084/requestors';
        return this.http.get<any>(url);
      }

      GetRequest(): Observable<Request>  {
        const url = 'http://127.0.0.1:5084/requestors';
        return this.http.get<Request>(url);
      }

      CreateRequest(): Observable<Request>  {
        const url = 'http://127.0.0.1:5084/requestors';
        return this.http.get<Request>(url);
      }
          
         
  }



