import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DecisionMaker } from '../model/decisionmaker.model';
import { RequestType } from '../model/requesttype.model';
import { Request } from '../model/request.model';
import { environment } from '../../../environments/environment';
import { RequestSection } from '../model/requestsection.model';
import { RequestDocument } from '../model/requestdocument.model';
@Injectable({
  providedIn: 'root'
})
export class RequestService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) { }

  loadRequests(): Observable<any> {
    return this.http.get<any>(this.url);
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
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.url}Requests`;
    return this.http.post<number>(url, request, { headers });
  }

  UpdateRequest(requestId: number, request: Request,): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.url}Requests/${requestId}`;
    return this.http.put<number>(url, request, { headers });
  }

  SaveRequiredDocuments(requestId: number, requiredDocumentTypes: DocumentType[]): Observable<boolean> {
    const body = JSON.stringify(requiredDocumentTypes);
    const headers = { 'Content-Type': 'application/json' };
    const options = { headers };
    const url = `${this.url}saverequireddocuments/${requestId}`;
    return this.http.post<boolean>(url, body, options);
  }

  UploadDocument(documentId: number, formData: FormData): Observable<any> {
    const url = `${this.url}Documents/${documentId}`;
    return this.http.post<void>(url, formData);
  }

  DeleteRequest(requestId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}Requests/${requestId}`);
  }

  UpdateRequestStatus(requestId: number, newRequestStatusId: number): Observable<void> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.put<void>(`${this.url}RequestStatus/${requestId}/${newRequestStatusId}`, { headers });
  }

  GetCancellationReasons(): Observable<any> {
    return this.http.get<any>(`${this.url}RequestCancellationReason`);
  }

  UpdateRequestCancelReason(requestId: number, requestCancelReasonId: number, requestCancelNote: string): Observable<void> {
    const body = { requestId, requestCancelReasonId, requestCancelNote };
    const headers = { 'Content-Type': 'application/json' };
    return this.http.put<void>(`${this.url}RequestCancellationReason/${requestId}`, body, { headers });
  }

  GetRequests(): Observable<any> {
    return this.http.get<any>(`${this.url}Requests`);
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

  SaveRequestSections(requestSection: RequestSection, requestId: number): Observable<{ success: boolean; requestSectionId: number | null }> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<{ success: boolean; requestSectionId: number | null }>(`${this.url}RequestSections/${requestId}`, requestSection, { headers });
  }

  GetRequiredDocuments(): Observable<any> {
    return this.http.get<any>(`${this.url}RequiredDocuments`);
  }

  GetOptionalDocuments(): Observable<any> {
    return this.http.get<any>(`${this.url}OptionalDocuments`);
  }

  GetMunicipalityDocuments(organizationId: number): Observable<any> {
    return this.http.get<any>(`${this.url}MunicipalityDocuments/${organizationId}`)
  }

  SaveOrganizationDocument(organizationId: number, municipalityDocument: any, file: File): Observable<any> {
    const url = `${this.url}MunicipalityDocuments/${organizationId}`;
    const formData = new FormData();
    formData.append('documentName', municipalityDocument.documentName);
    formData.append('file', file);
    return this.http.post<any>(url, formData);
  }

  DeleteOrganizationDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}MunicipalityDocuments/${documentId}`)
  }

  SaveRequestDocuments(requestId: number, requestDocuments: RequestDocument[]): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.url}RequestDocuments/${requestId}`;
    return this.http.post<any>(url, requestDocuments, { headers });
  }

  GetDocumentContent(organizationDocumentId: number, organizationId: number): Observable<Blob> {
    return this.http.get(`${this.url}OrganizationDocuments/DocumentContent/${organizationDocumentId}/${organizationId}`, { responseType: 'blob' });
  }

  GetRequestDetailsById(requestId: number): Observable<any> {
    return this.http.get<void>(`${this.url}Requests/${requestId}`);
  }

  GetRequestRequiredDocumentsById(requestId: number): Observable<any> {
    return this.http.get<any>(`${this.url}RequestDocuments/${requestId}`);
  }

  DeleteDecisionMaker(requestId: number, decisionMakerId: number): Observable<any> {
    return this.http.delete<void>(`${this.url}DecisionMakers/${requestId}/${decisionMakerId}`);
  }
}