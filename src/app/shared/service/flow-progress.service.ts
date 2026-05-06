import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root',
})
export class FlowProgressService {
  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {}

  getFlowProgress(userId: number, flowId: number): Observable<any> {
    return this.http.get<any>(
      `${this.config.apiUrl}user/${userId}/flow/${flowId}`,
    );
  }

  saveFlowProgress(
    userId: number,
    flowId: number,
    lastCompletedPageId: number,
  ): Observable<any> {
    return this.http.post<any>(
      `${this.config.apiUrl}user/${userId}/flow/${flowId}/progress?LastCompletedPageId=${lastCompletedPageId}`,
      null,
    );
  }
}
