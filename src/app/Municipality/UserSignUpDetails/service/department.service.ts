import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Department } from '../model/department.model';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {

  url = `${environment.apiUrl}departments`;

  constructor(private http: HttpClient) { }

  saveDepartment(department: Department): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<number>(this.url, department, { headers });
  }

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.url}`);
  }
}

