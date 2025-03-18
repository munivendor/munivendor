import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Organization } from '../model/organization.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VendorProfileService {
  apiUrl = `${environment.apiUrl}users/`;

  constructor(private http: HttpClient) {}

  // Save Organization (insert or update)
  saveOrganization(organization: Organization, organizationId?: number): Observable<{ isSuccess: boolean, vendorProfileId?: number, message: string }> {
    const url = organizationId ? `${this.apiUrl}/VendorProfiles/${organizationId}` : `${this.apiUrl}/VendorProfiles`;
    return this.http.post<{ isSuccess: boolean, vendorProfileId?: number, message: string }>(url, organization);
  }

  // Get Organization by ID
  getOrganization(organizationId: number): Observable<{ isSuccess: boolean, organization?: Organization, message: string }> {
    const url = `${this.apiUrl}/VendorProfiles/${organizationId}`;
    return this.http.get<{ isSuccess: boolean, organization?: Organization, message: string }>(url);
  }
}