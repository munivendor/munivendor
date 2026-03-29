import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OfferorDetails } from '../model/offeror-details.model';
import { OfferorLegalInfo } from '../model/offeror-legal-info.model';
import { OfferorStockholderInfo } from '../model/offeror-stockholder-info.model';
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

  // ── Stockholder Information ───────────────────────

  /**
   * GET /OfferorProfile/Stockholder/{organizationId?}/{stockholderId?}
   *
   * Fetches all stockholders for an organization, or a single one
   * when stockholderId is also provided.
   */
  GetAllStockholderInfo(
    organizationId: number,
    stockholderId?: number,
  ): Observable<OfferorStockholderInfo[]> {
    const base = `${this.url}OfferorProfile/Stockholder/${organizationId}`;
    const url = stockholderId != null ? `${base}/${stockholderId}` : base;
    return this.http.get<OfferorStockholderInfo[]>(url);
  }

  /**
   * POST /OfferorProfile/Stockholder/{organizationId}
   *
   * Creates a new stockholder record. Returns the new stockholder ID
   * and a correlation ID from the backend.
   * Note: The backend endpoint is MapPost despite the naming convention
   * used by the other endpoints.
   */
  CreateStockholderInfo(
    organizationId: number,
    payload: OfferorStockholderInfo,
  ): Observable<{ retStockholderId: number; CorrelationId: string }> {
    return this.http.post<{ retStockholderId: number; CorrelationId: string }>(
      `${this.url}OfferorProfile/Stockholder/${organizationId}`,
      payload,
    );
  }

  /**
   * PUT /OfferorProfile/Stockholder/{organizationId}/{stockholderId}
   *
   * Updates an existing stockholder record. Returns the stockholder ID
   * and a correlation ID from the backend.
   */
  UpdateStockholderInfo(
    organizationId: number,
    stockholderId: number,
    payload: OfferorStockholderInfo,
  ): Observable<{ stockholderId: number; CorrelationId: string }> {
    return this.http.put<{ stockholderId: number; CorrelationId: string }>(
      `${this.url}OfferorProfile/Stockholder/${organizationId}/${stockholderId}`,
      payload,
    );
  }

  /**
   * DELETE /OfferorProfile/Stockholder/{stockholderId}
   *
   * Deletes a stockholder record by its ID.
   */
  DeleteStockholderInfo(stockholderId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.url}OfferorProfile/Stockholder/${stockholderId}`,
    );
  }

  // ── List Data ─────────────────────────────────────

  // entityType is actually organizationSubTypeId in the backend
  GetOrganizationSubTypes(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/OrganizationSubTypes`);
  }

  GetCountries(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/Countries`);
  }
}
