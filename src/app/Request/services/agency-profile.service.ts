import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DecisionMaker } from '../model/decisionmaker.model';
import { UserDesignation } from '../model/user-designation.model';
import { AgencyDetails } from '../model/agency-details.model';
import { State } from '../../shared/model/state.model';

export interface UserDesignationsResponse {
  userDesignations: UserDesignation[];
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

  CreateUser(
    user: Omit<UserDesignation, 'confirmEmail' | 'designationId'>,
  ): Observable<number> {
    return this.http.post<number>(`${this.url}users`, user);
  }

  SaveUserDesignations(
    userId: number,
    designationIds: number[],
  ): Observable<void> {
    return this.http.post<void>(
      `${this.url}users/designation/${userId}`,
      designationIds,
    );
  }

  GetUserDesignations(organizationId: number): Observable<UserDesignation[]> {
    return this.http
      .get<UserDesignationsResponse>(
        `${this.url}users/designations/${organizationId}`,
      )
      .pipe(map((response) => response.userDesignations));
  }

  GetAgencyDetails(organizationId: number): Observable<AgencyDetails> {
    return this.http.get<AgencyDetails>(
      `${this.url}organizations/${organizationId}`,
    );
  }

  SaveAgencyDetails(
    organizationId: number,
    organization: AgencyDetails,
  ): Observable<{ OrganizationId: number }> {
    return this.http.put<{ OrganizationId: number }>(
      `${this.url}organizations/${organizationId}`,
      organization,
    );
  }

  GetStates(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/States`);
  }
}
