import { Injectable } from '@angular/core';
import { User } from '../../Municipality/Signup/model/user.model';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Designation } from '../model/designation.model';
import { UserSearchResults } from '../model/usersearchresult.model';

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

  updateUser(user: User): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.put<number>(`${this.userApiUrl}${user.userId}`, user, { headers });
  }

  getUser(userId: number): Observable<User> {
    return this.http.get<User>(`${this.userApiUrl}${userId}`);
  }
  

  getUsers(filter: string, pageNumber: number, pageSize: number): Observable<UserSearchResults>
   { 
    let params = new HttpParams() 
    .set('search', filter) 
    .set('pageNumber', pageNumber) 
    .set('pageSize', pageSize); 
    
    return this.http.get<UserSearchResults>(this.userApiUrl, { params });
   }


  getMunicipalityUsers(userId: number): Observable<User> {
    return this.http.get<User>(`${this.userApiUrl}${userId}`);
  }

  SendUserVerificationEmail(userId: number): Observable<boolean> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<boolean>(`${this.userApiUrl}/sendveremail/${userId}`, null, { headers });
  }

  ValidateEmailToken(token: string): Observable<boolean> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<boolean>(`${this.userApiUrl}/validate/${token}`, null, { headers });
  }

  designationApiUrl = `${environment.apiUrl}designations`;
  getDesignationTypes(): Observable<Designation[]> {
    return this.http.get<Designation[]>(this.designationApiUrl);
  }

  getRoles(): Observable<string[]> { return this.http.get<string[]>(`${this.userApiUrl}roles`);
 }
  getDesignations(): Observable<string[]> {
    return this.http.get<string[]>(`${this.designationApiUrl}`);
  }

}
