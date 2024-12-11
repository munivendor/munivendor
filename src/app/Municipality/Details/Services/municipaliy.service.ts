import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Municipality } from '../model/municipality.model';

@Injectable({
  providedIn: 'root',
})
export class MunicipalityService {

  url = `${environment.apiUrl}municipalities/`;

  constructor(private http: HttpClient) { }

  // Save municipality (insert or update based on ID presence)
  saveMunicipality(municipality: Municipality): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<number>(this.url, municipality, { headers });
  }

  getMunicipality(municipalityId: number): Observable<Municipality> {
    return this.http.get<Municipality>(`${this.url}${municipalityId}`);
  }
}
