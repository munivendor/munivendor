import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DecisionMaker } from '../model/decisionmaker.model';

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

  GetAgencyDecisionMakers(agencyOrganizationId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.url}DecisionMakers/${agencyOrganizationId}`,
    );
  }

  CreateAgencyDecisionMaker(
    organizationId: number,
    decisionMaker: DecisionMaker,
  ): Observable<DecisionMakerResponse> {
    return this.http.post<DecisionMakerResponse>(
      `${this.url}DecisionMakers/${organizationId}`,
      { ...decisionMaker, organizationId },
    );
  }

  UpdateAgencyDecisionMaker(
    organizationId: number,
    decisionMaker: DecisionMaker,
  ): Observable<DecisionMakerResponse> {
    return this.http.put<DecisionMakerResponse>(
      `${this.url}DecisionMakers/${organizationId}`,
      { ...decisionMaker, organizationId },
    );
  }

  DeleteAgencyDecisionMaker(
    decisionMakerId: number,
    organizationId: number,
  ): Observable<any> {
    return this.http.delete(
      `${this.url}DecisionMakers/${decisionMakerId}/Agency/${organizationId}`,
    );
  }
}
