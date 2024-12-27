import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  name: string;
  email: string;
  title: string;
  role: string;
  designee: string;
  status: string;
  tags: string[];
}

@Injectable({
  providedIn: 'root', // Global scope
})
export class UserService {
  private apiUrl = 'https://api.example.com/users'; // Replace with your API endpoint

  constructor(private http: HttpClient) {}

  // Fetch users from the API
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }
}
