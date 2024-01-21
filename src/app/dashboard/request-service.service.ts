import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as sql from 'mssql';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  
  constructor(private http: HttpClient) {}

      loadRequests (): Observable<any> {
      {
        const url = 'http://127.0.0.1:5084/requestors';
        return this.http.get<any>(url);
      }
  
  }
}
