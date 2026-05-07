import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Department } from '../model/department.model';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private get url(): string {
    return `${this.config.apiUrl}departments`;
  }

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {}

  saveDepartment(department: Department): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<number>(this.url, department, { headers });
  }

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(this.url);
  }
}
