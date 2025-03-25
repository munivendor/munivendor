import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Organization } from '../model/organization.model';
//import { VendorLegalInformation } from '../model/vendor-legal-information.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VendorProfileService {
  apiUrl = `${environment.apiUrl}users/`;

  constructor(private http: HttpClient) {}

  // Save Organization (insert or update)
  saveOrganization(organization: Organization, organizationId?: number): Observable<{ isSuccess: boolean, vendorProfileId?: number }> {
    const url = organizationId ? `${this.apiUrl}/VendorProfiles/${organizationId}` : `${this.apiUrl}/VendorProfiles`;
    return this.http.post<{ isSuccess: boolean, vendorProfileId?: number }>(url, organization);
  }

  // Get Organization by ID
  getOrganization(organizationId: number): Observable<{ isSuccess: boolean, organization?: Organization, message: string }> {
    const url = `${this.apiUrl}/VendorProfiles/${organizationId}`;
    return this.http.get<{ isSuccess: boolean, organization?: Organization, message: string }>(url);
  }

  /*
  // Get all Organizations (optional filtering by OrganizationTypeId)
  getOrganizations(organizationTypeId?: number): Observable<{ isSuccess: boolean, organizations?: Organization[], message: string }> {
    const url = `${this.apiUrl}/VendorProfiles`;
    const params = organizationTypeId ? { organizationTypeId: organizationTypeId.toString() } : {};
    return this.http.get<{ isSuccess: boolean, organizations?: Organization[], message: string }>(url, { params });
  }

  // Save VendorLegalInformation (insert or update)
  saveVendorLegalInformation(vendorLegalInformation: VendorLegalInformation, vendorLegalInformationId?: number): Observable<{ isSuccess: boolean, vendorLegalInformationId?: number, message: string }> {
    const url = vendorLegalInformationId ? `${this.apiUrl}/VendorLegalInformation/${vendorLegalInformationId}` : `${this.apiUrl}/VendorLegalInformation`;
    return this.http.post<{ isSuccess: boolean, vendorLegalInformationId?: number}>(url, vendorLegalInformation);
  }

  // Get VendorLegalInformation by ID
  getVendorLegalInformation(vendorLegalInformationId: number): Observable<{ isSuccess: boolean, vendorLegalInformation?: VendorLegalInformation, message: string }> {
    const url = `${this.apiUrl}/VendorLegalInformation/${vendorLegalInformationId}`;
    return this.http.get<{ isSuccess: boolean, vendorLegalInformation?: VendorLegalInformation }>(url);
  }

  // Get all VendorLegalInformation records
  getAllVendorLegalInformation(): Observable<{ isSuccess: boolean, vendorLegalInformationList?: VendorLegalInformation[] }> {
    const url = `${this.apiUrl}/VendorLegalInformation`;
    return this.http.get<{ isSuccess: boolean, vendorLegalInformationList?: VendorLegalInformation[] }>(url);
  }

  // Get Organization Types
  getOrganizationTypes(): Observable<Option[]> {
    return this.http.get<Option[]>('/api/organization-types');
  }

  // Get States
  getStates(): Observable<Option[]> {
    return this.http.get<Option[]>('/api/states');
  }
    

  // Save Stockholder Information (insert or update)
  saveStockholderInformation(stockholderInformation: StockholderInformation, stockholderId?: number): Observable<{ isSuccess: boolean; stockholderId?: number; message: string }> {
    const url = stockholderId ? `${this.apiUrl}/StockholderInformation/${stockholderId}` : `${this.apiUrl}/StockholderInformation`;
    return this.http.post<{ isSuccess: boolean; stockholderId?: number; message: string }>(url, stockholderInformation);
  }

  // Get Stockholder Information by ID
  getStockholderInformation(stockholderId: number): Observable<{ isSuccess: boolean; stockholderInformation?: StockholderInformation; message: string }> {
    const url = `${this.apiUrl}/StockholderInformation/${stockholderId}`;
    return this.http.get<{ isSuccess: boolean; stockholderInformation?: StockholderInformation; message: string }>(url);
  }

  // Get all Stockholder Information records
  getAllStockholderInformation(): Observable<{ isSuccess: boolean; stockholderInformationList?: StockholderInformation[] }> {
    const url = `${this.apiUrl}/StockholderInformation`;
    return this.http.get<{ isSuccess: boolean; stockholderInformationList?: StockholderInformation[] }>(url);
  }

 
  getCounties(): Observable<{ isSuccess: boolean, counties?: string[], message: string }> {
    const url = `${this.apiUrl}/Counties`; // Adjust the API endpoint as needed
    return this.http.get<{ isSuccess: boolean, counties?: string[], message: string }>(url);
  }
*/
  // Get Times
  getTimes(): Observable<{ isSuccess: boolean, times?: string[], message: string }> {
    const url = `${this.apiUrl}/Times`; // Adjust the API endpoint as needed
    return this.http.get<{ isSuccess: boolean, times?: string[], message: string }>(url);
  }

  getContactInformation(contactId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${contactId}`);
  }

  saveContactInformation(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  // Add to VendorProfileService

// Get Compliance Form Types
getComplianceFormTypes(): Observable<{ isSuccess: boolean, complianceFormTypes?: string[] }> {
  const url = `${this.apiUrl}/ComplianceFormTypes`;
  return this.http.get<{ isSuccess: boolean, complianceFormTypes?: string[] }>(url);
}

// Get Compliance Data by ID
getComplianceData(id: number): Observable<{ isSuccess: boolean, complianceData?: any }> {
  const url = `${this.apiUrl}/ComplianceData/${id}`;
  return this.http.get<{ isSuccess: boolean, complianceData?: any }>(url);
}

// Save Compliance Data
saveComplianceData(data: any): Observable<{ isSuccess: boolean }> {
  const url = `${this.apiUrl}/ComplianceData`;
  return this.http.post<{ isSuccess: boolean }>(url, data);
}
}