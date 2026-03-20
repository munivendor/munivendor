import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OfferorDetails } from '../model/offeror-details.model';
import { OfferorLegalInfo } from '../model/offeror-legal-info.model';
import { State } from '../../shared/model/state.model';

@Injectable({
  providedIn: 'root',
})
export class OfferorProfileService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Authorizing Officials ─────────────────────────

  GetOfferorAuthorizingOfficials(organizationId: number): Observable<any> {
    return this.http.get<any[]>(
      `${this.url}OfferorProfile/Organization/AuthorizingOfficials/${organizationId}`,
    );
  }

  SaveOfferorAuthorizingOfficial(official: any): Observable<any> {
    return this.http.post(
      `${this.url}OfferorProfile/AuthorizingOfficials`,
      official,
    );
  }

  UpdateOfferorAuthorizingOfficial(
    officialId: number,
    official: any,
  ): Observable<any> {
    return this.http.put(
      `${this.url}OfferorProfile/AuthorizingOfficials/${officialId}`,
      official,
    );
  }

  GetStates(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/States`);
  }

  // ── Organization Details ──────────────────────────

  GetOfferorOrganizationDetails(
    organizationId: number,
  ): Observable<OfferorDetails> {
    return this.http.get<OfferorDetails>(
      `${this.url}OfferorProfiles/Organization/${organizationId}`,
    );
  }

  SaveOfferorOrganizationDetails(
    organization: OfferorDetails,
    organizationId?: number | null,
  ): Observable<{ organizationId: number }> {
    const url = organizationId
      ? `${this.url}OfferorProfiles/Organization/${organizationId}`
      : `${this.url}OfferorProfiles/Organization`;

    return this.http.post<{ organizationId: number }>(url, organization);
  }

  // ── Legal Information ─────────────────────────────

  GetLegalInfo(
    organizationId: number,
    offerorLegalInformationId?: number,
  ): Observable<OfferorLegalInfo> {
    const base = `${this.url}OfferorProfile/LegalInformation/${organizationId}`;
    const url =
      offerorLegalInformationId != null
        ? `${base}/${offerorLegalInformationId}`
        : base;
    return this.http.get<OfferorLegalInfo>(url);
  }

  CreateLegalInfo(
    payload: OfferorLegalInfo,
  ): Observable<{ OfferorLegalInformationId: number }> {
    return this.http.post<{ OfferorLegalInformationId: number }>(
      `${this.url}OfferorProfile/LegalInformation`,
      payload,
    );
  }

  UpdateLegalInfo(
    offerorLegalInformationId: number,
    payload: OfferorLegalInfo,
  ): Observable<{ OfferorLegalInformationId: number }> {
    return this.http.put<{ OfferorLegalInformationId: number }>(
      `${this.url}OfferorProfile/LegalInformation/${offerorLegalInformationId}`,
      payload,
    );
  }

  // entityType is actually organizationSubTypeId in the backend
  GetOrganizationSubTypes(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/OrganizationSubTypes`);
  }

  GetCountries(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/Countries`);
  }
}
