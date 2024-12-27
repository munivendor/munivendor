import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CCPaymentProfileData } from '../model/CCPaymentProfileData';
import { CustomerProfileData } from '../model/CustomerProfileData';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentInfoService {
  
   apiUrl = `${environment.apiUrl}paymentprofile`;

  constructor(private http: HttpClient) { }

  saveACHPaymentInfo(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-ach-payment-info`, data);
  }

  /*saveCreditCardPaymentInfo(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-credit-card-payment-info`, data);
  }*/

  saveInvoicePaymentInfo(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-invoice-payment-info`, data);
  }

  // Add methods to fetch current payment information
  getACHPaymentInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-ach-payment-info`);
  }

  getCreditCardPaymentInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-credit-card-payment-info`);
  }

  getInvoicePaymentInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-invoice-payment-info`);
  }

  saveCreditCardPaymentInfo(municipalityId: number, customerProfileData: CustomerProfileData, paymentProfileData: CCPaymentProfileData): Observable<string> {
    const body = {
        customerProfileData,
        paymentProfileData
    };
    return this.http.post<string>(`${this.apiUrl}/${municipalityId}`, body);
}

}

