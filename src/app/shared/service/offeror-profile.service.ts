import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OfferorProfileService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  GetOfferorAuthorizingOfficials(organizationId: number): Observable<any> {
    return this.http.get<any[]>(
      `${this.url}AuthorizingOfficials/organization/${organizationId}`
    );
  }

  SaveOfferorAuthorizingOfficial(official: any): Observable<any> {
    return this.http.post(`${this.url}AuthorizingOfficials`, official);
  }

  UpdateOfferorAuthorizingOfficial(
    officialId: number,
    official: any
  ): Observable<any> {
    return this.http.put(
      `${this.url}AuthorizingOfficials/${officialId}`,
      official // 👈 send body
    );
  }
}
