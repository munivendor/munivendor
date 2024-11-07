import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { SubCategory } from '../model/subcategory.model';
import { DecisionMaker } from '../model/decisionmaker.model';
import { RequestType } from '../model/requesttype.model';
import { Request } from '../model/request.model';
import { environment } from '../../../environments/environment';
import { RequestSection } from '../model/requestsection.model';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) { }

  loadRequests(): Observable<any> {
    return this.http.get<any>(this.url);
  }

  GetSubcategories(categoryId: number): Observable<SubCategory[]> {
    let params = this.url + 'Subcategories/' + categoryId
    return this.http.get<SubCategory[]>(params);
  }

  GetDecisionMakers(): Observable<DecisionMaker[]> {
    return this.http.get<DecisionMaker[]>(this.url + 'DecisionMakers');
  }

  GetRequestTypes(): Observable<RequestType[]> {
    return this.http.get<RequestType[]>(this.url + 'RequestTypes');
  }

  GetRequest(): Observable<Request> {
    return this.http.get<Request>(this.url + 'getdecisionmakers');
  }

  CreateRequest(request: Request): Observable<number> {

    const body = JSON.stringify(request);
    const headers = { 'Content-Type': 'application/json' };
    const options = { headers };
    return this.http.post<number>(this.url + 'createrequest', body, options);

  }

  SaveRequiredDocuments(requestId: number, requiredDocumentTypes: DocumentType[]): Observable<boolean> {
    const body = JSON.stringify(requiredDocumentTypes);
    const headers = { 'Content-Type': 'application/json' };
    const options = { headers };
    const url = `${this.url}saverequireddocuments/${requestId}`;
    return this.http.post<boolean>(url, body, options);
  }

  UploadMunicipalityRequestDocument(requestId: number, file: File, documentTitle?: string): Observable<any> {
    console.log("hello")
    const url = `${this.url}/UploadDocument/${requestId}`;
    const formData = new FormData();
  
    // Append the file and optional document title
    formData.append('file', file, file.name);
    if (documentTitle) {
      formData.append('documentTitle', documentTitle);
    }
  
    // Send the request with the FormData
    return this.http.post(url, formData, { reportProgress: true, observe: 'events' });
  }

  DeleteMunicipalityRequestDocument(requestId: number, additionalRequestDocumentId: number): Observable<boolean> {
    const url = `${this.url}deleteadditionaldocument/${requestId}/${additionalRequestDocumentId}`;
    return this.http.delete<boolean>(url).pipe(
      tap((response: any) => console.log('DELETE response:', response)), // Log the response
      catchError((error: any) => {
        console.error('DELETE error:', error); // Log any errors
        return throwError(error);
      })
    );
  }

  DeleteRequest(requestId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}DeleteRequest/${requestId}`);
  }

  UpdateRequestStatus(requestId: number, newRequestStatusId: number): Observable<void> {
    const body = { requestId, requestStatusId: newRequestStatusId };  // Ensure both parameters are included
    const headers = { 'Content-Type': 'application/json' };  // Set Content-Type to application/json
    return this.http.put<void>(`${this.url}UpdateRequestStatus/${requestId}`, body, { headers });  // Send the request body as JSON
  }

  GetCancellationReasons(): Observable<any> {
    return this.http.get<any>(`${this.url}GetRequestCancellationReasons`);
  }

  UpdateRequestCancelReason(requestId: number, requestCancelReasonId: number, requestCancelOtherNote: string): Observable<void> {
    const body = { requestId, requestCancelReasonId, requestCancelOtherNote };
    const headers = { 'Content-Type': 'application/json' };
    return this.http.put<void>(`${this.url}UpdateRequestCancellationReason/${requestId}`, body, { headers });
  }

  GetRequests(): Observable<any> {
    return this.http.get<any>(`${this.url}Requests`);
  }

  GetCategories(): Observable<any> {
    return this.http.get<any>(`${this.url}Categories`);
  }

  GetRequestStatuses(): Observable<any> {
    return this.http.get<any>(`${this.url}RequestStatus`);
  }

  GetRequestSections(requestId: number): Observable<any> {
    return this.http.get<any>(`${this.url}RequestSections/${requestId}`);
  }

  GetRequestSectionDefaultTitles(): Observable<any> {
    return this.http.get<any>(`${this.url}RequestSectionDefaults`);
  }

  SaveRequestSections(requestSection: RequestSection): Observable<void> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<void>(`${this.url}RequestSections`, requestSection, { headers });
  }

  GetRequiredDocuments(): Observable<any> {
    return this.http.get<any>(`${this.url}RequiredDocuments`);
  }

  GetOptionalDocuments(): Observable<any> {
    return this.http.get<any>(`${this.url}OptionalDocuments`);
  }

  GetMunicipalityDocuments(municipalityId: number): Observable<any> {
    return this.http.get<any>(`${this.url}MunicipalityDocuments/${municipalityId}`)
  }

  SaveMunicipalityDocument(municipalityId: number, municipalityDocument: any): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.url}MunicipalityDocuments/${municipalityId}`;
    return this.http.post<void>(url, municipalityDocument, {headers} )
  }

  DeleteMunicipalityDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}MunicipalityDocuments/${documentId}`)
  }

  UploadDocument(documentId: number, formData: FormData): Observable<any> {
    const url = `${this.url}Documents/${documentId}`;
    return this.http.post<void>(url, formData);
  }

  SaveRequestDocuments(requestId: number, documentIds: number[]): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.url}RequestDocuments/${requestId}`;
    return this.http.post<void>(url, documentIds, { headers });
  }
}



