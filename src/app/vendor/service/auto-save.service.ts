import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root', // Provided in the root injector for singleton usage
})
export class AutoSaveService {
  private autoSaveUrl = 'https://api.example.com/auto-save'; // Replace with your API endpoint

  constructor(private http: HttpClient) {}

  /**
   * Sends the form data to the server for auto-saving.
   * @param formData The form data to save.
   * @returns An observable that emits the server response.
   */
  autoSaveForm(formData: any): Observable<any> {
    return this.http.post(this.autoSaveUrl, formData);
  }
}