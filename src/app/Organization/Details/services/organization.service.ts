import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Organization } from '../model/organization.model';
import { State } from '../../../shared/model/state.model';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private get url(): string {
    return this.config.apiUrl;
  }

  private get organizationUrl(): string {
    return `${this.config.apiUrl}organizations`;
  }

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {}

  initializeOrganization(organization: Organization): Observable<any> {
    return this.http.post<any>(
      `${this.organizationUrl}/initialize`,
      organization,
    );
  }

  updateOrganization(organization: Organization): Observable<any> {
    return this.http.put<any>(
      `${this.organizationUrl}/${organization.organizationId}`,
      organization,
    );
  }

  getOrganization(organizationId: number): Observable<Organization> {
    return this.http.get<Organization>(
      `${this.organizationUrl}/${organizationId}`,
    );
  }

  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(this.organizationUrl);
  }

  getStates(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/States`);
  }
}
