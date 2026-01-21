import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CCPaymentProfileData } from '../model/CCPaymentProfileData';
import { ACHPaymentProfileData } from '../model/ACHPaymentProfileData';
import { CustomerProfileData } from '../model/CustomerProfileData';
import { environment } from '../../../../environments/environment';

export interface SavedPaymentMethod {
  paymentProfileId: string;
  accountType: 'ACH' | 'CC';
  lastFourNumbers: string;
  cardType?: string;
  bankAccountType?: number;
  isDefault: boolean;
  customerPaymentProfileId?: string;
}

export interface PaymentMethodDetails {
  id: string;
  accountType: 'ACH' | 'CC';
  nameOnCard?: string;
  firstName?: string;
  lastName?: string;
  expirationDate?: string;
  maskedCardNumber?: string;
  bankRoutingNumber?: string;
  bankAccountMasked?: string;
  bankAccountType?: number;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
}

export interface SubmitOfferResponse {
  correlationId: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentInfoService {
  apiUrl = `${environment.apiUrl}paymentprofile`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  getBankAccountTypes(): Observable<any[]> {
    return this.http.get<any[]>(`api/ListData/BankAccountTypes`);
  }

  saveCreditCardPaymentInfo(
    organizationId: number,
    customerProfileData: CustomerProfileData,
    CCPaymentProfileData: CCPaymentProfileData,
    selectedPaymentType: string
  ): Observable<string> {
    const body = {
      selectedPaymentType,
      customerProfileData,
      CCPaymentProfileData,
    };
    return this.http.post<string>(`api/PaymentProfile/${organizationId}`, body);
  }

  saveACHPaymentInfo(
    organizationId: number,
    customerProfileData: CustomerProfileData,
    ACHPaymentProfileData: ACHPaymentProfileData,
    selectedPaymentType: string
  ): Observable<string> {
    const body = {
      selectedPaymentType,
      customerProfileData,
      ACHPaymentProfileData,
    };
    return this.http.post<string>(`api/PaymentProfile/${organizationId}`, body);
  }

  getSavedPaymentMethods(
    organizationId: number
  ): Observable<SavedPaymentMethod[]> {
    return this.http
      .get<any>(`api/PaymentProfiles/Summary/${organizationId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          return response?.paymentProfileDetails || [];
        })
      );
  }

  // ability to view detailed info of specific payment method
  // for editing purposes
  // getPaymentMethodDetails(
  //   organizationId: number,
  //   paymentProfileId: string
  // ): Observable<PaymentMethodDetails[]> {
  //   return this.http
  //     .get<PaymentMethodDetails[]>(
  //       `api/PaymentProfiles/Details/${organizationId}/${paymentProfileId}`,
  //       { headers: this.getHeaders() }
  //     )
  //     .pipe(
  //       map((response) => {
  //         return Array.isArray(response) ? response : [response];
  //       })
  //     );
  // }

  updatePaymentMethod(
    organizationId: number,
    paymentProfileId: string,
    paymentProfileRequest: any
  ): Observable<{ paymentProfileId: string; correlationId: string }> {
    return this.http.post<{ paymentProfileId: string; correlationId: string }>(
      `api/PaymentProfile/Update/${organizationId}?paymentProfileId=${paymentProfileId}`,
      paymentProfileRequest,
      { headers: this.getHeaders() }
    );
  }

  deletePaymentMethod(
    organizationId: number,
    paymentProfileId: string
  ): Observable<any> {
    return this.http.delete<any>(
      `api/PaymentProfiles/${organizationId}/${paymentProfileId}`,
      { headers: this.getHeaders() }
    );
  }

  setDefaultPaymentMethod(
    organizationId: number,
    paymentMethodId: string
  ): Observable<any> {
    return this.http.post<any>(
      `api/PaymentProfiles/SetDefault/${organizationId}/${paymentMethodId}`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getBillingHistory(organizationId: number): Observable<any[]> {
    return this.http.get<any[]>(`api/BillingHistory/${organizationId}`, {
      headers: this.getHeaders(),
    });
  }

  chargePayment(
    organizationId: number,
    paymentPlanId: number,
    paymentProfileId: number
  ): Observable<any> {
    return this.http.post(
      `api/Payment/Charge/${organizationId}/${paymentPlanId}/${paymentProfileId}`,
      {}
    );
  }

  // charges user submission credit if available
  // updated request status to 9 - Offer Submitted
  submitOffer(
    organizationId: number,
    requestId: number,
    paymentProfileId?: number,
    paymentPlanId?: number
  ): Observable<SubmitOfferResponse> {
    let url = `api/Offer/Submit/${organizationId}/${requestId}`;

    if (paymentProfileId !== undefined && paymentProfileId !== null) {
      url += `/${paymentProfileId}`;

      if (paymentPlanId !== undefined && paymentPlanId !== null) {
        url += `/${paymentPlanId}`;
      }
    }

    return this.http.post<SubmitOfferResponse>(
      url,
      {},
      {
        headers: this.getHeaders(),
      }
    );
  }
}
