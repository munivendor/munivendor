import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface CreditPackage {
  id: number;
  name: string;
  credits: number;
  price: number;
  discount?: string;
  selected: boolean;
  quantity: number;
}

export interface SubmissionBalanceResponse {
  submissionBalance: number;
  correlationId: string;
}

export interface SubmissionCreditUsageItem {
  createDate: string;
  paymentMethod: string;
  creditChargeDesc: string;
  solicitationId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CreditPackageService {
  private apiUrl = '/api/PaymentPlans/';

  constructor(private http: HttpClient) {}

  getPaymentPlans(): Observable<CreditPackage[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((response) => {
        const plans = response?.paymentPlan || response?.PaymentPlan;

        if (!plans || !Array.isArray(plans)) {
          console.error('Invalid response structure:', response);
          throw new Error('Invalid payment plans response');
        }

        const mappedPlans = plans.map((plan) => {
          return {
            id: plan.paymentPlanId,
            name: plan.description,
            credits: plan.allowedSubmissions,
            price: plan.cost,
            discount: plan.discount,
            selected: false,
            quantity: plan.allowedSubmissions,
          };
        });

        return mappedPlans;
      }),
      catchError((error) => {
        console.error('Error fetching payment plans:', error);
        return throwError(() => error);
      })
    );
  }

  getSubmissionBalance(
    organizationId: number
  ): Observable<{ submissionBalance: number; correlationId: string }> {
    return this.http
      .get<{
        submissionBalance: number;
        correlationId: string;
      }>(`/api/SubmissionBalance/${organizationId}`)
      .pipe(
        map((res) => ({
          submissionBalance: res.submissionBalance,
          correlationId: res.correlationId,
        })),
        catchError((error) => {
          console.error('Error fetching submission balance:', error);
          return throwError(() => error);
        })
      );
  }

  getSubmissionCreditUsage(
    organizationId: number
  ): Observable<SubmissionCreditUsageItem[]> {
    return this.http
      .get<SubmissionCreditUsageItem[]>(
        `/api/SubmissionCredits/Usage/${organizationId}`
      )
      .pipe(
        catchError((error) => {
          console.error('Error fetching submission credit usage:', error);
          return throwError(() => error);
        })
      );
  }
}
