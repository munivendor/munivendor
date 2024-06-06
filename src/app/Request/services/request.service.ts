import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../model/category.model';
import { SubCategory } from '../model/subcategory.model';
import { DecisionMaker } from '../model/decisionmaker.model';
import { RequestType } from '../model/requesttype.model';


@Injectable({
  providedIn: 'root'
})
export class RequestService {
  
  constructor(private http: HttpClient) {}
  const url = 'http://127.0.0.1:5084/requestors';

      loadRequests (): Observable<any> 
      {
        return this.http.get<any>(this.url);
      }
      
      getCategories(): Observable<Category []>  {
        
        return this.http.get<Category []>(this.url);
      }

      GetSubcategories(categoryId: number): Observable<SubCategory []>  {
        return this.http.get<SubCategory []>(this.url); 
      }

      GetDecisionMakers(): Observable<DecisionMaker []>  {
        return this.http.get<DecisionMaker []>(this.url);
      }

      GetRequestTypes(): Observable<RequestType []>  {
        return this.http.get<RequestType []>(this.url);
      }

      GetRequest(): Observable<Request>  {
        return this.http.get<Request>(this.url);
      }

      CreateRequest(): Observable<Request>  {
        return this.http.get<Request>(this.url);
      }
          
         
  }



