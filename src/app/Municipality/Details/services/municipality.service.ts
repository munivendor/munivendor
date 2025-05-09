import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Municipality } from '../model/municipality.model';
import { State } from '../../../shared/model/state.model';

@Injectable({
  providedIn: 'root',
})
export class MunicipalityService {

  url = `${environment.apiUrl}`;
  municipalityUrl = `${environment.apiUrl}municipalities`;

  constructor(private http: HttpClient) { }

  saveMunicipality(municipality: Municipality, userId: number): Observable<number> {
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.municipalityUrl}?userId=${userId}`;
    return this.http.post<number>(url, municipality, { headers });
  }

  getMunicipality(municipalityId: number): Observable<Municipality> {
    return this.http.get<Municipality>(`${this.municipalityUrl}${municipalityId}`);
  }

  getMunicipalities(): Observable<Municipality[]> {
    return this.http.get<Municipality[]>(this.municipalityUrl);
  }

  getStates(): Observable<State[]> {
    return this.http.get<State[]>(`${this.url}ListData/States`);
  }
}
