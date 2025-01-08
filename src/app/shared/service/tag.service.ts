// services/tag.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tag } from '../models/tag.model';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private apiUrl = '/api/tags'; // Adjust the API URL as needed

  constructor(private http: HttpClient) { }

  getTags(userId: number): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/user/${userId}`);
  }

  getAllTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(this.apiUrl); // Assuming a general endpoint for all tags
  }

  addTagsToUser(userId: number, tags: Tag[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/user/${userId}/add`, tags);
  }

  deleteTag(tagId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${tagId}`);
  }
}
