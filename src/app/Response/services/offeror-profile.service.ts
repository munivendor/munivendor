import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OfferorDetails } from '../model/offeror-details.model';
import { OfferorLegalInfo } from '../model/offeror-legal-info.model';
import { OfferorStockholderInfo } from '../model/offeror-stockholder-info.model';
import { State } from '../../shared/model/state.model';
import { OrganizationDocument } from '../model/organization-document.model';
import { DocumentType } from '../model/document-type.model';

@Injectable({
  providedIn: 'root',
})
export class OfferorProfileService {
  url = environment.apiUrl;
  private states$?: Observable<State[]>;
  private countries$?: Observable<State[]>;
  private stockholderTypes$?: Observable<State[]>;
  private counties$?: Observable<State[]>;
  private timeOptions$?: Observable<State[]>;

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

  DeleteOfferorAuthorizingOfficial(
    organizationId: number,
    officialId: number,
  ): Observable<any> {
    return this.http.delete(
      `${this.url}OfferorProfile/AuthorizingOfficials/${organizationId}/${officialId}`,
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
    if (!this.states$) {
      this.states$ = this.http
        .get<State[]>(`${this.url}ListData/States`)
        .pipe(shareReplay(1));
    }
    return this.states$;
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
  GetAllStockholderInfo(
    organizationId: number,
    stockholderId?: number,
  ): Observable<OfferorStockholderInfo[]> {
    const base = `${this.url}OfferorProfile/Stockholder/${organizationId}`;
    const url = stockholderId != null ? `${base}/${stockholderId}` : base;
    return this.http.get<OfferorStockholderInfo[]>(url);
  }

  CreateStockholderInfo(
    organizationId: number,
    payload: OfferorStockholderInfo,
  ): Observable<{ retStockholderId: number; CorrelationId: string }> {
    return this.http.post<{ retStockholderId: number; CorrelationId: string }>(
      `${this.url}OfferorProfile/Stockholder/${organizationId}`,
      payload,
    );
  }

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
   * DELETE /OfferorProfile/Stockholder/{organizationId}/{stockholderId}
   *
   * Deletes a stockholder record by its ID.
   */
  DeleteStockholderInfo(
    organizationId: number,
    stockholderId?: number,
  ): Observable<void> {
    const url = stockholderId
      ? `${this.url}OfferorProfile/Stockholder/${organizationId}/${stockholderId}`
      : `${this.url}OfferorProfile/Stockholder/${organizationId}`;
    return this.http.delete<void>(url);
  }

  // ── List Data ─────────────────────────────────────

  // entityType is actually organizationSubTypeId in the backend
  GetOrganizationSubTypes(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/OrganizationSubTypes`);
  }

  GetCountries(): Observable<State[]> {
    if (!this.countries$) {
      this.countries$ = this.http
        .get<State[]>(`${this.url}ListData/Countries`)
        .pipe(shareReplay(1));
    }
    return this.countries$;
  }

  GetCounties(): Observable<State[]> {
    if (!this.counties$) {
      this.counties$ = this.http
        .get<State[]>(`${this.url}ListData/Counties`)
        .pipe(shareReplay(1));
    }
    return this.counties$;
  }

  GetTimeOptions(): Observable<State[]> {
    if (!this.timeOptions$) {
      this.timeOptions$ = this.http
        .get<State[]>(`${this.url}ListData/TimeOptions`)
        .pipe(shareReplay(1));
    }
    return this.timeOptions$;
  }

  GetStockholderTypes(): Observable<State[]> {
    if (!this.stockholderTypes$) {
      this.stockholderTypes$ = this.http
        .get<State[]>(`${this.url}ListData/StockholderTypes`)
        .pipe(shareReplay(1));
    }
    return this.stockholderTypes$;
  }

  GetOrganizationDocuments(
    organizationId: number,
  ): Observable<OrganizationDocument[]> {
    return this.http
      .get<{
        documents: OrganizationDocument[];
      }>(`${this.url}OrganizationDocuments/${organizationId}`)
      .pipe(map((res) => res.documents));
  }

  GetDocumentTypes(): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.url}ListData/DocumentTypes`);
  }

  SaveOfferorProfileDetails(
    organizationId: number,
    documentTypeId: number,
    details: string | null,
  ): Observable<{ offerorProfileId: number }> {
    return this.http.post<{ offerorProfileId: number }>(
      `${this.url}OfferorProfiles/Details/${organizationId}`,
      { documentTypeId, details },
    );
  }

  GetOfferorProfileDiscloserDetails(
    organizationId: number,
  ): Observable<
    { offerorProfileId: number; documentTypeId: number; details: string }[]
  > {
    return this.http
      .get<{
        correlationId: string;
        offerProfileDetails: {
          offerorProfileId: number;
          documentTypeId: number;
          formTypeName: string | null;
          details: string;
          organizationId: number;
        }[];
      }>(`${this.url}OfferorProfiles/Details/${organizationId}`)
      .pipe(map((res) => res?.offerProfileDetails ?? []));
  }

  UpdateOfferorProfileDetails(
    organizationId: number,
    offerorProfileId: number,
    documentTypeId: number,
    details: string,
  ): Observable<{ offerorProfileId: number }> {
    return this.http.put<{ offerorProfileId: number }>(
      `${this.url}OfferorProfiles/Details/${organizationId}`,
      { offerorProfileId, documentTypeId, details },
    );
  }

  // mapId = documentTypeId
  DeleteOfferorProfileDetails(
    organizationId: number,
    documentTypeId: number,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.url}OfferorProfiles/Details/${organizationId}/${documentTypeId}`,
    );
  }
}
