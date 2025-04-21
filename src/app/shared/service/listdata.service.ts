import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ListDataService {
  private baseUrl = `${environment.apiUrl}`; 

  constructor(private http: HttpClient) {}

  getStates(): Observable<Option[]> {
    return this.http.get<Option[]>(`${this.baseUrl}ListData/States`);
  }

  getOrganizationTypes(): Observable<Option[]> {
    return this.http.get<Option[]>(`${this.baseUrl}ListData/OrganizationTypes`);
  }

  getCounties(): Observable<Option[] > {
    const url = `${this.baseUrl}ListData/Counties`;
    return this.http.get< Option[] >(url);
  }
  getTimes(): Observable<Option[]>{
    const url = `${this.baseUrl}ListData/Times`; // Adjust the API endpoint as needed
    return this.http.get<Option[]>(url);
  }
}
  
  export interface Option {
    codeId: number;
    codeDesc: string;
  }