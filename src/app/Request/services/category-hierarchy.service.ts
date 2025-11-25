import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { map, Observable } from 'rxjs';
import { CategoryNode } from '../../shared/model/category-tree.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryHierarchyService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  GetCategoryHierarchy(): Observable<CategoryNode[]> {
    return this.http.get<string>(`${this.apiUrl}CategoryHierarchy`).pipe(
      map((categoryHierarchyString) => {
        const result = JSON.parse(categoryHierarchyString);
        return result as CategoryNode[];
      })
    );
  }

  SaveCategoryHierarchy(categoryHierarchy: string): Observable<any> {
    return this.http.put(`${this.apiUrl}CategoryHierarchy`, categoryHierarchy, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
