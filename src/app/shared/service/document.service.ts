import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentInstance } from '../../Request/model/documentinstance.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  downloadPDF(): Observable<Blob> {
    return this.http.get(this.url, { responseType: 'blob' });
  }

  GetStateDocumentContent(documentId: number): Observable<Blob> {
    return this.http.get(
      `${this.url}Documents/DocumentContent/StateDocument/${documentId}`,
      { responseType: 'blob' }
    );
  }

  GetDocumentInstance(
    responseRequestId: number,
    sourceRequestDocumentId: number
  ): Observable<Blob> {
    return this.http.get(
      `${this.url}DocumentInstances/DocumentContent/${responseRequestId}/${sourceRequestDocumentId}`,
      { responseType: 'blob' }
    );
  }

  UploadDocumentInstance(
    responseRequestId: number,
    sourceRequestDocumentId: number,
    file: File
  ): Observable<{ isSuccess: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ isSuccess: boolean }>(
      `${this.url}DocumentInstances/DocumentContent/${responseRequestId}/${sourceRequestDocumentId}`,
      formData
    );
  }

  GetAllDocumentInstances(requestId: number): Observable<any> {
    return this.http.get<{ documentInstance: DocumentInstance[] }>(
      `${this.url}DocumentInstances`,
      {
        params: new HttpParams().set('requestId', requestId),
      }
    );
  }

  GetAutoFillStatus(
    requestId: number
  ): Observable<{ isAutoFillComplete: boolean; pollFrequency: number }> {
    return this.http.get<{
      isAutoFillComplete: boolean;
      pollFrequency: number;
    }>(`${this.url}DocumentInstances/AutoFillStatus/${requestId}`);
  }
}
