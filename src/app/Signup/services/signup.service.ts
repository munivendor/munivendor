import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";


@Injectable({
    providedIn: "root",
})
export class SignupService {
    private url = `${environment.apiUrl}`;

    constructor(private http: HttpClient) { }

    getOrganizationTypes(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}ListData/OrganizationTypes`);
    }
}
