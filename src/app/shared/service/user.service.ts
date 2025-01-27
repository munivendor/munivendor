import { Injectable } from '@angular/core';
import { User } from '../model/user.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Designation } from '../../UserDesignationSelection/model/designation.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  constructor(private http: HttpClient) { }
  
  userApiUrl = `${environment.apiUrl}users/`;
  createUser(user: User): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<number>(`${this.userApiUrl}Users`, user, { headers });
  }

  updateUser(user: User): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.put<number>(`${this.userApiUrl}${user.userId}`, user, { headers });
  }

  getUser(userId: number): Observable<User> {
    return this.http.get<User>(`${this.userApiUrl}${userId}`);
  }

  getMunicipalityUsers(municipalityId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.userApiUrl}${municipalityId}`);
  }

  SendUserVerificationEmail(userId: number): Observable<boolean> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<boolean>(`${this.userApiUrl}/sendveremail/1`, null, { headers });
  }

  ValidateEmailToken(token: string): Observable<boolean> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<boolean>(`${this.userApiUrl}/validate/${token}`, null, { headers });
  }

  designeeApiUrl = `${environment.apiUrl}designations`;
  getDesigneeTypes(): Observable<Designation[]> {
    return this.http.get<Designation[]>(this.designeeApiUrl);
  }

}
