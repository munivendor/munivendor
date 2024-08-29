import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../model/category.model';
import { SubCategory } from '../model/subcategory.model';
import { DecisionMaker } from '../model/decisionmaker.model';
import { RequestType } from '../model/requesttype.model';
import { Request } from '../model/request.model';
import { environment} from '../../../environments/environment';
import { DocumentType } from '../model/documenttype.model';

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
        const headers = { 'Content-Type': 'application/json' };
        const options = { headers };
        return this.http.post<number>(this.url +'createrequest', body, options);
       
      }

      GetRequiredDocuments(municipalityId: number): Observable<DocumentType []>  {
        let params = this.url+'getrequireddocuments/'+municipalityId
        return this.http.get<DocumentType[]>(params); 
      }

      SaveRequiredDocuments(requestId: number, requiredDocumentTypes: DocumentType []): Observable<boolean> {

        const body = JSON.stringify(requiredDocumentTypes);
        const headers = { 'Content-Type': 'application/json' };
        const options = { headers };

        const url = `${this.url}saverequireddocuments/${requestId}`;
        return this.http.post<boolean>(url,  body, options);
      }

      UploadDocumentType(requestId: number, requiredDocumentTypes: DocumentType []): Observable<boolean> {

        const body = JSON.stringify(requiredDocumentTypes);
        const headers = { 'Content-Type': 'application/json' };
        const options = { headers };

        const url = `${this.url}saverequireddocuments/${requestId}`;
        return this.http.post<boolean>(url,  body, options);
      }
                     
  }



