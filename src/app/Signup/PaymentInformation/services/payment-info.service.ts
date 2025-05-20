import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CCPaymentProfileData } from '../model/CCPaymentProfileData';
import { ACHPaymentProfileData } from '../model/ACHPaymentProfileData';
import { CustomerProfileData } from '../model/CustomerProfileData';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentInfoService {

  apiUrl = `${environment.apiUrl}paymentprofile`;

  constructor(private http: HttpClient) { }
  saveCreditCardPaymentInfo(organizationId: number, customerProfileData: CustomerProfileData, CCPaymentProfileData: CCPaymentProfileData, selectedPaymentType: string): Observable<string> {
    const body = {
      selectedPaymentType,
      customerProfileData,
      CCPaymentProfileData
    };
    return this.http.post<string>(`${this.apiUrl}/${organizationId}`, body);
  }

  saveACHPaymentInfo(organizationId: number, customerProfileData: CustomerProfileData, ACHPaymentProfileData: ACHPaymentProfileData, selectedPaymentType: string): Observable<string> {
    const body = {
      selectedPaymentType,
      customerProfileData,
      ACHPaymentProfileData
    };
    return this.http.post<string>(`${this.apiUrl}/${organizationId}`, body);
  }

  saveInvoicePaymentInfo(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-invoice-payment-info`, data);
  }

  getACHPaymentInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-ach-payment-info`);
  }

  getCreditCardPaymentInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-credit-card-payment-info`);
  }

  getInvoicePaymentInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-invoice-payment-info`);
  }
}

