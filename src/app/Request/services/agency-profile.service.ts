import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// What the GET endpoint returns
export interface DecisionMaker {
  decisionMakerId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string | null;
  phoneNumber?: string | null;
}

// What the POST/PUT endpoints expect
export interface DecisionMakerForm {
  decisionMakerId?: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  title?: string | null;
}

export interface DecisionMakerResponse {
  correlationId: string;
  decisionMakerId: number;
}

@Injectable({
  providedIn: 'root',
})
export class AgencyProfileService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  GetDecisionMakers(agencyOrganizationId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.url}DecisionMakers/${agencyOrganizationId}`,
    );
  }

  CreateDecisionMaker(
    organizationId: number,
    decisionMaker: DecisionMakerForm,
  ): Observable<DecisionMakerResponse> {
    let params = new HttpParams()
      .set('firstName', decisionMaker.firstName)
      .set('lastName', decisionMaker.lastName)
      .set('email', decisionMaker.email);

    if (decisionMaker.decisionMakerId != null)
      params = params.set('decisionMakerId', decisionMaker.decisionMakerId);
    if (decisionMaker.phoneNumber != null)
      params = params.set('phoneNumber', decisionMaker.phoneNumber);
    if (decisionMaker.title != null)
      params = params.set('title', decisionMaker.title);

    return this.http.post<DecisionMakerResponse>(
      `${this.url}DecisionMakers/${organizationId}`,
      null,
      { params },
    );
  }

  UpdateDecisionMaker(
    organizationId: number,
    decisionMaker: DecisionMakerForm,
  ): Observable<DecisionMakerResponse> {
    let params = new HttpParams().set(
      'decisionMakerId',
      decisionMaker.decisionMakerId!,
    );

    if (decisionMaker.firstName)
      params = params.set('firstName', decisionMaker.firstName);
    if (decisionMaker.lastName)
      params = params.set('lastName', decisionMaker.lastName);
    if (decisionMaker.email) params = params.set('email', decisionMaker.email);
    if (decisionMaker.phoneNumber)
      params = params.set('phoneNumber', decisionMaker.phoneNumber);
    if (decisionMaker.title) params = params.set('title', decisionMaker.title);

    return this.http.put<DecisionMakerResponse>(
      `${this.url}DecisionMakers/${organizationId}`,
      null,
      { params },
    );
  }

  DeleteDecisionMaker(
    requestId: number,
    decisionMakerId: number,
  ): Observable<any> {
    return this.http.delete(
      `${this.url}DecisionMakers/${requestId}/${decisionMakerId}`,
    );
  }
}
