import { Injectable } from '@angular/core';
import { User } from '../model/User';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {

    url = environment.apiUrl;
    constructor(private http: HttpClient) { }
    SaveUser(user: User): Observable<number> {
        const headers = { 'Content-Type': 'application/json' };
        return this.http.post<number>(`${this.url}Users`, user, { headers });
  }

    SendUserVerificationEmail(userId: number): Observable<boolean> {
      const headers = { 'Content-Type': 'application/json' };
      return this.http.post<boolean>(`${this.url}users/sendveremail/1`, null, { headers });
    }

    ValidateEmailToken(token: string): Observable<boolean> {
      const headers = { 'Content-Type': 'application/json' };
      return this.http.post<boolean>(`${this.url}/users/validate/{userId}`, null, { headers });
    }
}
