import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class FlowProgressService {
    constructor(private http: HttpClient) { }

    getFlowProgress(userId: number, flowId: number): Observable<any> {
        const url = `${environment.apiUrl}user/${userId}/flow/${flowId}`;
        return this.http.get<any>(url);
    }

    saveFlowProgress(userId: number, flowId: number, lastCompletedPageId: number): Observable<any> {
        const url = `${environment.apiUrl}user/${userId}/flow/${flowId}/progress?LastCompletedPageId=${lastCompletedPageId}`;
        return this.http.post<any>(url, null);
    }
}