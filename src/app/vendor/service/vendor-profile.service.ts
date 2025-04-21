import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Organization } from '../model/organization.model';
import { environment } from '../../../environments/environment';
import { ComplianceFormType } from '../model/complianceformtype.model';
import { VendorDocument } from '../model/vendordocument.model';

@Injectable({
  providedIn: 'root'
})
export class VendorProfileService {
  apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  saveOrganization(organization: Organization, organizationId?: number): Observable<{ isSuccess: boolean, organizationId: number }> {
    const url = organizationId ? `${this.apiUrl}VendorProfiles/${organizationId}` : `${this.apiUrl}VendorProfiles`;
    return this.http.post<{ isSuccess: boolean, organizationId: number }>(url, organization);
  }

  getOrganization(organizationId: number): Observable<{ isSuccess: boolean, organization?: Organization, message: string }> {
    const url = `${this.apiUrl}VendorProfiles/${organizationId}`;
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

 */
  

  getContact(contactId: number): Observable<{ isSuccess: boolean, contact?: any, message?: string }> {
    const url = `${this.apiUrl}Contacts/${contactId}`;
    return this.http.get<{ isSuccess: boolean, contact?: any, message?: string }>(url);
  }

  saveContact(contact: any, contactId?: number): Observable<{ isSuccess: boolean, contactId: number }> {
    const url = contactId ? `${this.apiUrl}Contacts/${contactId}` : `${this.apiUrl}Contacts`;
    return this.http.post<{ isSuccess: boolean, contactId: number }>(url, contact);
  }
  
  getContactInformation(contactId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${contactId}`);
  }

  saveContactInformation(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }


getComplianceFormTypes(): Observable<{complianceFormType: ComplianceFormType[]}> {
  const url = `${this.apiUrl}VendorDocuments2/RFC/2`;
  return this.http.get<  {complianceFormType: ComplianceFormType[]} >(url);
}

  saveVendorDocument(
    organizationId: number,
    documentId: number,
    vendorDocumentId: number | null,
    file: File
  ): Observable<{isSuccess: number, vendorDocumentId: number }> {
    const formData = new FormData();
    formData.append('file', file, file.name); 

    let url = `${this.apiUrl}VendorDocuments/${organizationId}/${documentId}`;

    if (vendorDocumentId !== null && vendorDocumentId !== undefined) {
      url += `/${vendorDocumentId}`;
    }
    return this.http.post<{ isSuccess: number, vendorDocumentId: number }>(url, formData);
  }

  getVendorDocuments(
    organizationId: number,
    documentId?: number,
    vendorDocumentId?: number
  ): Observable< VendorDocument [] | null > {
    let url = `${this.apiUrl}VendorDocuments/${organizationId}`;
  
    // Build URL based on provided parameters
    if (documentId !== undefined && documentId !== null) {
      url += `/${documentId}`;
    } else if (vendorDocumentId !== undefined && vendorDocumentId !== null) {
      url += `/null/${vendorDocumentId}`; // Use 'null' as placeholder for documentId
    }
  
    return this.http.get<  VendorDocument[] | null >(url);
  }


uploadVendorDocument(organizationId: number, documentType: number, file: File): Observable<VendorDocument> {
  const formData = new FormData();
  formData.append('file', file);
  
  return this.http.post<VendorDocument>(
    `${this.apiUrl}/vendors/${organizationId}/documents`,
    formData,
    {
      params: { documentType: documentType.toString() }
    }
  );
}

deleteVendorDocument(organizationId: number, vendorDocumentId: number): Observable<void> {
  return this.http.delete<void>(
    `${this.apiUrl}VendorDocuments/${organizationId}/${vendorDocumentId}`
  );
}

downloadVendorDocument(organizationId: number, vendorDocumentId: number): Observable<Blob> {
  const url = `${this.apiUrl}VendorDocuments/${organizationId}/${vendorDocumentId}`;
  return this.http.get(url, { responseType: 'blob' });
}

getComplianceData(id: number): Observable<{ isSuccess: boolean, complianceData?: any }> {
  const url = `${this.apiUrl}/ComplianceData/${id}`;
  return this.http.get<{ isSuccess: boolean, complianceData?: any }>(url);
}


saveComplianceData(data: any): Observable<{ isSuccess: boolean }> {
  const url = `${this.apiUrl}/ComplianceData`;
  return this.http.post<{ isSuccess: boolean }>(url, data);
}
}