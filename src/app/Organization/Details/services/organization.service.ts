import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Organization } from '../model/organization.model';
import { State } from '../../../shared/model/state.model';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {

  url = `${environment.apiUrl}`;
  organizationUrl = `${environment.apiUrl}organizations`;

  constructor(private http: HttpClient) { }

  saveOrganization(organization: Organization): Observable<any> {
    const url = `${this.organizationUrl}`;
    return this.http.post<any>(url, organization);
  }

  updateOrganization(organization: Organization): Observable<any> {
    const url = `${this.organizationUrl}/${organization.organizationId}`;
    return this.http.put<any>(url, organization);
  }

  getOrganization(organizationId: number): Observable<Organization> {
    return this.http.get<Organization>(`${this.organizationUrl}${organizationId}`);
  }

  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(this.organizationUrl);
  }

  getStates(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/States`);
  }
}
