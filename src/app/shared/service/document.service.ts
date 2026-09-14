import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { DocumentInstance } from '../../Request/model/documentinstance.model';

export interface DocumentResponseType {
  codeId: number;
  codeName: string;
  codeDesc: string;
  mapId: number;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private get url(): string {
    return this.config.apiUrl;
  }

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {}
  GetStateDocumentContent(documentId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.url}Documents/DocumentContent/StateDocument/${documentId}`,
      {
        observe: 'response',
        responseType: 'blob',
      },
    );
  }

  GetDocumentInstance(
    requestDocumentId: number,
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.url}DocumentInstances/DocumentContent/${requestDocumentId}`,
      { observe: 'response', responseType: 'blob' },
    );
  }

  UploadDocumentInstance(
    responseRequestId: number,
    sourceRequestDocumentId: number,
    file: File,
  ): Observable<{ isSuccess: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ isSuccess: boolean }>(
      `${this.url}DocumentInstances/DocumentContent/${responseRequestId}/${sourceRequestDocumentId}`,
      formData,
    );
  }

  GetAllDocumentInstances(requestId: number): Observable<any> {
    return this.http.get<{ documentInstance: DocumentInstance[] }>(
      `${this.url}DocumentInstances`,
      {
        params: new HttpParams().set('requestId', requestId),
      },
    );
  }

  GetAutoFillStatus(
    requestId: number,
  ): Observable<{ isAutoFillComplete: boolean; pollFrequency: number }> {
    return this.http.get<{
      isAutoFillComplete: boolean;
      pollFrequency: number;
    }>(`${this.url}DocumentInstances/AutoFillStatus/${requestId}`);
  }

  GetCombinedDocumentsContent(
    requestId: number,
    active?: boolean,
  ): Observable<Blob> {
    let params = new HttpParams();
    if (active !== undefined) {
      params = params.set('active', active);
    }

    return this.http.get(`${this.url}CombinedDocuments/Content/${requestId}`, {
      params,
      responseType: 'blob',
    });
  }

  DownloadOfferorZipDocuments(
    requestId: number,
    requestTypeId?: number,
    requestStatusId?: number,
    organizationId?: number,
    limit?: number,
    offset?: number,
  ): Observable<Blob> {
    let params = new HttpParams();

    if (requestTypeId !== undefined) {
      params = params.set('requestTypeId', requestTypeId.toString());
    }
    if (requestStatusId !== undefined) {
      params = params.set('requestStatusId', requestStatusId.toString());
    }
    if (organizationId !== undefined) {
      params = params.set('organizationId', organizationId.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }

    return this.http.get(
      `${this.url}Documents/DocumentContent/Response/SharedDrive/Zip/${requestId}`,
      {
        params,
        responseType: 'blob',
      },
    );
  }

  /**
   * Calls GET /documents/parameterized to generate an autofilled PDF for the
   * given offer/document. The backend fills the PDF and uploads it
   * server-side, returning only `{ correlationId }` as JSON — there is no
   * file content in the response for the caller to download.
   *
   * NOTE: `requestDocumentId` (the row's own instance id) is passed as the
   * API's `sourceRequestDocumentId` param — NOT the row's `sourceRequestDocumentId`
   * field, which refers to a different, unrelated row.
   */
  AutofillDocument(
    offerId: number,
    requestDocumentId: number,
    documentId: number,
  ): Observable<HttpResponse<{ correlationId: string }>> {
    const params = new HttpParams()
      .set('offerId', offerId)
      .set('sourceRequestDocumentId', requestDocumentId)
      .set('documentId', documentId);

    // observe: 'response' so callers can inspect the HTTP status code —
    // the backend returns 206 (Partial Content) when the document was
    // autofilled but some fields could not be filled in.
    return this.http.get<{ correlationId: string }>(
      `${this.url}documents/parameterized`,
      { params, observe: 'response' },
    );
  }

  UpdateRequestDocumentApproval(
    requestDocumentId: number,
    approved: boolean,
  ): Observable<{ isSuccess: boolean }> {
    return this.http.put<{ isSuccess: boolean }>(`${this.url}RequestDocument`, {
      requestDocumentId: requestDocumentId,
      approved: approved,
    });
  }

  ResetDocumentInstance(
    requestDocumentId: number,
  ): Observable<{ isSuccess: boolean; correlationId: string }> {
    return this.http.post<{ isSuccess: boolean; correlationId: string }>(
      `${this.url}DocumentInstances/Reset/${requestDocumentId}`,
      {},
    );
  }

  GetDocumentResponseTypes(): Observable<DocumentResponseType[]> {
    return this.http.get<DocumentResponseType[]>(
      `${this.url}ListData/DocumentResponseTypes`,
    );
  }

  GetLatestUploadedDocument(
    organizationId: number,
    requestDocumentId: number,
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.url}documents/LatestUploaded/${organizationId}/${requestDocumentId}`,
      {
        observe: 'response',
        responseType: 'blob',
      },
    );
  }
}
