import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../model/category.model';
import { SubCategory } from '../model/subcategory.model';
import { DecisionMaker } from '../model/decisionmaker.model';
import { RequestType } from '../model/requesttype.model';
import { environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

      loadRequests (): Observable<any> 
      {
        
        return this.http.get<any>(this.url);
      }
      
      getCategories(): Observable<Category []>  {
        
        return this.http.get<Category []>(this.url+'getcategories'); 
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

      /*GetRequestOverview(): Observable<Request>  {
        return this.http.get<Request>(this.url);
      }*/
               
  }



