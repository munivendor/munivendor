import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { CategoryNode } from '../../shared/model/category-tree.model';

@Injectable({
    providedIn: 'root'
})
export class CategoryHierarchyService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getCategoryHierarchy(): Observable<CategoryNode[]> {
        return this.http.get<CategoryNode[]>(`${this.apiUrl}CategoryHierarchy`);
    }

    saveCategoryHierarchy(categoryHierarchy: CategoryNode[]): Observable<any> {
        return this.http.put(`${this.apiUrl}CategoryHierarchy`, categoryHierarchy);
    }
}