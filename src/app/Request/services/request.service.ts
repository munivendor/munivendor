import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DecisionMaker } from '../model/decisionmaker.model';
import { RequestType } from '../model/requesttype.model';
import { Request } from '../model/request.model';
import { environment } from '../../../environments/environment';
import { RequestSection } from '../model/requestsection.model';
import { RequestDocument } from '../model/requestdocument.model';
import { DocumentInstance } from '../model/documentinstance.model';
import { Response } from '../../shared/model/response.model';
@Injectable({
  providedIn: 'root',
})
export class RequestService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  loadRequests(): Observable<any> {
    return this.http.get<any>(this.url);
  }

  GetDecisionMakers(agencyOrganizationId: number): Observable<DecisionMaker[]> {
    return this.http.get<DecisionMaker[]>(
      `${this.url}DecisionMakers/${agencyOrganizationId}`
    );
  }

  GetRequestTypes(): Observable<RequestType[]> {
    return this.http.get<RequestType[]>(this.url + 'RequestTypes');
  }

  GetRequest(): Observable<Request> {
    return this.http.get<Request>(this.url + 'getdecisionmakers');
  }

  CreateRequest(request: Request | Response): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.url}Requests`;
    return this.http.post<number>(url, request, { headers });
  }

  UpdateRequest(
    requestId: number,
    request: Request | Response
  ): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.url}Requests/${requestId}`;
    return this.http.put<number>(url, request, { headers });
  }

  SaveRequiredDocuments(
    requestId: number,
    requiredDocumentTypes: DocumentType[]
  ): Observable<boolean> {
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

  DeleteRequest(requestId: number, organizationId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.url}Requests/${requestId}?organizationId=${organizationId}`
    );
  }

  UpdateRequestStatus(
    requestId: number,
    newRequestStatusId: number
  ): Observable<void> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.put<void>(
      `${this.url}RequestStatus/${requestId}/${newRequestStatusId}`,
      { headers }
    );
  }

  GetCancellationReasons(): Observable<any> {
    return this.http.get<any>(`${this.url}RequestCancellationReason`);
  }

  UpdateRequestCancelReason(
    requestId: number,
    requestCancelReasonId: number,
    requestCancelNote: string
  ): Observable<void> {
    const body = { requestId, requestCancelReasonId, requestCancelNote };
    const headers = { 'Content-Type': 'application/json' };
    return this.http.put<void>(
      `${this.url}RequestCancellationReason/${requestId}`,
      body,
      { headers }
    );
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

  SaveRequestSections(
    requestSection: RequestSection,
    requestId: number
  ): Observable<{ success: boolean; requestSectionId: number | null }> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<{
      success: boolean;
      requestSectionId: number | null;
    }>(`${this.url}RequestSections/${requestId}`, requestSection, { headers });
  }

  GetRequiredDocuments(): Observable<any> {
    return this.http.get<any>(`${this.url}RequiredDocuments`);
  }

  GetOptionalDocuments(): Observable<any> {
    return this.http.get<any>(`${this.url}OptionalDocuments`);
  }

  GetMunicipalityDocuments(organizationId: number): Observable<any> {
    return this.http.get<any>(
      `${this.url}MunicipalityDocuments/${organizationId}`
    );
  }

  SaveOrganizationDocument(
    organizationId: number,
    municipalityDocument: any,
    file: File
  ): Observable<any> {
    const url = `${this.url}MunicipalityDocuments/${organizationId}`;
    const formData = new FormData();
    formData.append('documentName', municipalityDocument.documentName);
    formData.append('file', file);
    return this.http.post<any>(url, formData);
  }

  SaveOfferorDocument(
    requestId: number,
    offerorDocument: any,
    file: File
  ): Observable<any> {
    const url = `${this.url}RequestDocuments/DocumentContent/Response/${requestId}`;
    const formData = new FormData();
    formData.append('documentName', offerorDocument.documentName);
    formData.append('file', file);
    return this.http.post<any>(url, formData);
  }

  deleteRequestDocument(
    requestId: number,
    requestDocumentId: number
  ): Observable<{ isSuccess: boolean }> {
    return this.http.delete<{ isSuccess: boolean }>(
      `${this.url}RequestDocuments/${requestId}/${requestDocumentId}`
    );
  }

  DeleteOrganizationDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.url}MunicipalityDocuments/${documentId}`
    );
  }

  SaveRequestDocuments(
    requestId: number,
    requestDocuments: RequestDocument[]
  ): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.url}RequestDocuments/${requestId}`;
    return this.http.post<any>(url, requestDocuments, { headers });
  }

  GetAgencySpecificDocumentContent(
    organizationDocumentId: number,
    organizationId: number
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.url}OrganizationDocuments/DocumentContent/${organizationDocumentId}/${organizationId}`,
      {
        observe: 'response',
        responseType: 'blob',
      }
    );
  }

  GetOfferorDocumentContent(requestDocumentId: number): Observable<Blob> {
    return this.http.get(
      `${this.url}RequestDocuments/DocumentContent/Response/${requestDocumentId}`,
      { responseType: 'blob' }
    );
  }

  GetRequestDetailsById(requestId: number): Observable<any> {
    return this.http.get<void>(`${this.url}Requests/${requestId}`);
  }

  GetRequestRequiredDocumentsById(requestId: number): Observable<any> {
    return this.http.get<any>(`${this.url}RequestDocuments/${requestId}`);
  }

  DeleteDecisionMaker(
    requestId: number,
    decisionMakerId: number
  ): Observable<any> {
    return this.http.delete<void>(
      `${this.url}DecisionMakers/${requestId}/${decisionMakerId}`
    );
  }

  GetDocumentInstances(requestId: number): Observable<DocumentInstance[]> {
    return this.http.get<DocumentInstance[]>(
      `${this.url}InstanceDocuments/${requestId}`
    );
  }

  GetRequestsOfferorView(params: {
    requestId?: number;
    requestTypeId?: number;
    agencyRequestStatusIds?: number;
    offerorRequestStatusIds?: number;
    organizationId: number;
    categoryId?: number;
    referenceId?: string;
    requestName?: string;
    startCloseDate?: string;
    endCloseDate?: string;
    startPublishDate?: string;
    endPublishDate?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    const { organizationId, ...queryParams } = params;
    const httpParams = new HttpParams({ fromObject: { ...queryParams } });

    return this.http.get<any>(`${this.url}requests/offeror-grid`, {
      params: httpParams.set('organizationId', organizationId.toString()),
    });
  }

  GetRequestsAgencyView(params: {
    requestId?: number;
    requestTypeIds?: number[];
    requestStatusIds?: number[];
    organizationId: number;
    categoryId?: number;
    referenceId?: string;
    requestName?: string;
    startCloseDate?: string;
    endCloseDate?: string;
    startPublishDate?: string;
    endPublishDate?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    const { organizationId, ...queryParams } = params;
    let httpParams = new HttpParams();
    httpParams = httpParams.set('organizationId', organizationId.toString());

    if (queryParams.requestTypeIds && queryParams.requestTypeIds.length > 0) {
      queryParams.requestTypeIds.forEach((id) => {
        httpParams = httpParams.append('requestTypeId', id.toString());
      });
    }

    if (
      queryParams.requestStatusIds &&
      queryParams.requestStatusIds.length > 0
    ) {
      queryParams.requestStatusIds.forEach((id) => {
        httpParams = httpParams.append('requestStatusId', id.toString());
      });
    }

    const { requestTypeIds, requestStatusIds, ...otherParams } = queryParams;
    Object.keys(otherParams).forEach((key) => {
      const value = (otherParams as any)[key];
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<any>(`${this.url}requests/agency-grid`, {
      params: httpParams,
    });
  }
}
