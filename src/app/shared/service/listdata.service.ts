import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
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
    return this.http.get<Array<{
      organizationSubtypeId: number,
      organizationSubtypeDesc: string,
      category: string
    }>>(`${this.baseUrl}ListData/IncorporationTypes`).pipe(
      map((response: { organizationSubtypeId: number; organizationSubtypeDesc: string; }[]) => response.map((item: { organizationSubtypeId: number; organizationSubtypeDesc: string; }) => ({
        codeId: item.organizationSubtypeId,
        codeDesc: item.organizationSubtypeDesc
      })))
    );
  }

  getTimeOptions(): Observable<Option[]> {
  return this.http.get<Option[]>(`${this.baseUrl}ListData/TimeOptions`);
}

  getCounties(): Observable<Option[] > {
    const url = `${this.baseUrl}ListData/Counties`;
    return this.http.get< Option[] >(url);
  }
  getTimes(): Observable<Option[]>{
    const url = `${this.baseUrl}ListData/TimeOptions`; 
    return this.http.get<Option[]>(url);
  }
}
  
  export interface Option {
    codeId: number;
    codeDesc: string;
  }