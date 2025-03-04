import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  downloadPDF(): Observable<Blob> {
    return this.http.get(this.url, { responseType: 'blob' });
  }
}