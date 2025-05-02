import { Injectable } from '@angular/core';
import { User } from '../model/user.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Designation } from '../model/designation.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  constructor(private http: HttpClient) { }
  
  userApiUrl = `${environment.apiUrl}users/`;
  createUser(user: User): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<number>(`${this.userApiUrl}`, user, { headers });
  }

  loginUser(username: string, password: string): Observable<{ userId: number }> {
    const headers = { 'Content-Type': 'application/json' };
    const loginPayload = { username, password };
  
    return this.http.post<{ userId: number }>(
      `${environment.apiUrl}login`,
      loginPayload,
      {
        headers,
        withCredentials: true,
      }
    );
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
    return this.http.post<boolean>(`${this.userApiUrl}sendveremail/${userId}`, null, { headers });
  }

  ValidateEmailToken(token: string, userId: number): Observable<boolean> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<boolean>(`${this.userApiUrl}validate/${token}/${userId}`, null, { headers });
  }

  designeeApiUrl = `${environment.apiUrl}designations`;
  getDesigneeTypes(): Observable<Designation[]> {
    return this.http.get<Designation[]>(this.designeeApiUrl);
  }
}
