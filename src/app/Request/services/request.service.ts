import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../model/category.model';
import { SubCategory } from '../model/subcategory.model';
import { DecisionMaker } from '../model/decisionmaker.model';
import { RequestType } from '../model/requesttype.model';
import { Request } from '../model/request.model';
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
        let params = this.url+'getsubcategories/'+categoryId

        return this.http.get<SubCategory []>(params); 
      }

      GetDecisionMakers(): Observable<DecisionMaker []>  {
        return this.http.get<DecisionMaker []>(this.url +'getdecisionmakers');
      }

      GetRequestTypes(): Observable<RequestType []>  {
        return this.http.get<RequestType []>(this.url +'getrequesttypes');
      }

      GetRequest(): Observable<Request>  {
        return this.http.get<Request>(this.url +'getdecisionmakers');
      }

      CreateRequest(request: Request): Observable<number>  {

        const body = JSON.stringify(request);
        console.log(body);

        const headers = { 'Content-Type': 'application/json' };
        const options = { headers };
      

        return this.http.post<number>(this.url +'createrequest', body, options);
       
      }

      /*GetRequestOverview(): Observable<Request>  {
        return this.http.get<Request>(this.url);
      }*/
               
  }



