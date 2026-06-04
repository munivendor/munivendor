import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root',
})
export class SignupService {
  private get url(): string {
    return this.config.apiUrl;
  }

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {}

  getOrganizationTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}ListData/OrganizationTypes`);
  }
}
