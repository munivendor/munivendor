import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AddendumService {
  constructor(private http: HttpClient) {}

  SaveSolicitationAddendumResponse(
    solicitationId: number,
    offerId: number,
    organizationId: number,
    frontendAddendumCount: number,
  ): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}Requests/Addendum/${solicitationId}/${offerId}`,
      null,
      {
        params: {
          organizationId: organizationId.toString(),
          frontendAddendumCount: frontendAddendumCount.toString(),
        },
      },
    );
  }

  // responseId is entityId
  logAddendumAcknowledgment(
    responseId: number,
    eventTypeId: number,
    eventNote: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}event/${responseId}/${eventTypeId}`,
      eventNote,
      { headers: { 'Content-Type': 'text/plain' } },
    );
  }
}
