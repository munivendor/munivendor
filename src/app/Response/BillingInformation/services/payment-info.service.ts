import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CCPaymentProfileData } from '../model/CCPaymentProfileData';
import { ACHPaymentProfileData } from '../model/ACHPaymentProfileData';
import { CustomerProfileData } from '../model/CustomerProfileData';
import { environment } from '../../../../environments/environment';

export interface StoredPaymentMethod {
  id: string;
  type: 'ACH' | 'CC';
  lastFour: string;
  cardType?: string;
  accountType?: string;
  isDefault: boolean;
  customerPaymentProfileId?: string; // For Authorize.Net integration
}

export interface PaymentMethodDetails {
  id: string;
  type: 'ACH' | 'CC';
  nameOnCard?: string;
  firstName?: string;
  lastName?: string;
  expirationDate?: string;
  maskedCardNumber?: string;
  maskedRoutingNumber?: string;
  maskedAccountNumber?: string;
  accountType?: string;
  address?: {
    streetAddress1: string;
    streetAddress2?: string;
    city: string;
    state: string;
    zip: string;
  };
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

  /**
   * Hash sensitive payment data before sending to backend
   * NOTE: This is a basic implementation. Your backend should handle
   * the actual encryption/tokenization with Authorize.Net or similar
   */
  private hashSensitiveData(data: any, type: 'ACH' | 'CC'): any {
    const hashedData = { ...data };

    if (type === 'CC') {
      // Keep card info for payment processor tokenization
      // Backend will handle secure tokenization
      hashedData.lastFour = data.cardNumber?.slice(-4) || '';
      hashedData.cardType = this.detectCardType(data.cardNumber);
    } else if (type === 'ACH') {
      // Keep last 4 for display
      hashedData.lastFour = data.accountNumber?.slice(-4) || '';

      // Remove confirmation fields (not needed by backend)
      delete hashedData.confirmRoutingNumber;
      delete hashedData.confirmAccountNumber;
    }

    return hashedData;
  }

  private detectCardType(cardNumber: string = ''): string {
    cardNumber = cardNumber.replace(/\D/g, '');

    if (/^4/.test(cardNumber)) return 'visa';
    if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber))
      return 'mastercard';
    if (/^3[47]/.test(cardNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cardNumber)) return 'discover';
    return 'unknown';
  }

  // ==================== EXISTING METHODS (Updated) ====================

  // saveCreditCardPaymentInfo(
  //   organizationId: number,
  //   customerProfileData: CustomerProfileData,
  //   CCPaymentProfileData: CCPaymentProfileData,
  //   selectedPaymentType: string
  // ): Observable<string> {
  //   // Add hashing/preparation logic
  //   const preparedData = this.hashSensitiveData(CCPaymentProfileData, 'CC');

  //   const body = {
  //     selectedPaymentType,
  //     customerProfileData,
  //     CCPaymentProfileData: { ...CCPaymentProfileData, ...preparedData },
  //   };
  //   return this.http.post<string>(`${this.apiUrl}/${organizationId}`, body);
  // }

  saveCreditCardPaymentInfo(
    organizationId: number,
    customerProfileData: CustomerProfileData,
    CCPaymentProfileData: CCPaymentProfileData,
    selectedPaymentType: string
  ): Observable<string> {
    // Add hashing/preparation logic
    const preparedData = this.hashSensitiveData(CCPaymentProfileData, 'CC');

    const body = {
      selectedPaymentType,
      customerProfileData,
      CCPaymentProfileData: { ...CCPaymentProfileData, ...preparedData },
    };
    return this.http.post<string>(`api/PaymentProfile/${organizationId}`, body);
  }

  // saveACHPaymentInfo(
  //   organizationId: number,
  //   customerProfileData: CustomerProfileData,
  //   ACHPaymentProfileData: ACHPaymentProfileData,
  //   selectedPaymentType: string
  // ): Observable<string> {
  //   // Add hashing/preparation logic
  //   const preparedData = this.hashSensitiveData(ACHPaymentProfileData, 'ACH');

  //   const body = {
  //     selectedPaymentType,
  //     customerProfileData,
  //     ACHPaymentProfileData: { ...ACHPaymentProfileData, ...preparedData },
  //   };
  //   return this.http.post<string>(`${this.apiUrl}/${organizationId}`, body);
  // }

  saveACHPaymentInfo(
    organizationId: number,
    customerProfileData: CustomerProfileData,
    ACHPaymentProfileData: ACHPaymentProfileData,
    selectedPaymentType: string
  ): Observable<string> {
    // Add hashing/preparation logic
    const preparedData = this.hashSensitiveData(ACHPaymentProfileData, 'ACH');

    const body = {
      selectedPaymentType,
      customerProfileData,
      ACHPaymentProfileData: { ...ACHPaymentProfileData, ...preparedData },
    };
    return this.http.post<string>(`api/PaymentProfile/${organizationId}`, body);
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

  // ==================== NEW METHODS FOR PAYMENT MANAGEMENT ====================

  /**
   * Get all stored payment methods for a user
   * Backend should return masked/tokenized data only
   */
  // getStoredPaymentMethods(userId: number): Observable<StoredPaymentMethod[]> {
  //   // TODO: Remove mock data when backend is ready
  //   const USE_MOCK_DATA = false; // Set to false when backend is implemented

  //   if (USE_MOCK_DATA) {
  //     return this.getMockPaymentMethods(userId);
  //   }

  //   return this.http
  //     .get<any>(`${this.apiUrl}/user/${userId}/payment-methods`, {
  //       headers: this.getHeaders(),
  //     })
  //     .pipe(
  //       map((response) => {
  //         // Transform backend response to StoredPaymentMethod format
  //         if (Array.isArray(response)) {
  //           return response;
  //         }
  //         // If backend returns different format, adapt here
  //         return response.paymentMethods || [];
  //       })
  //     );
  // }

  getStoredPaymentMethods(
    organizationId: number
  ): Observable<StoredPaymentMethod[]> {
    // TODO: Remove mock data when backend is ready
    const USE_MOCK_DATA = true; // Set to false when backend is implemented

    if (USE_MOCK_DATA) {
      return this.getMockPaymentMethods(organizationId);
    }

    return this.http
      .get<any>(`api/PaymentProfiles/Details/${organizationId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => {
          // Transform backend response to StoredPaymentMethod format
          if (Array.isArray(response)) {
            return response;
          }
          // If backend returns different format, adapt here
          return response.paymentProfileDetails || [];
        })
      );
  }

  /**
   * Mock data for development/testing
   * Returns hardcoded payment methods
   */
  private getMockPaymentMethods(
    userId: number
  ): Observable<StoredPaymentMethod[]> {
    const mockData: StoredPaymentMethod[] = [
      {
        id: 'pm_mock_001',
        type: 'CC',
        lastFour: '4242',
        cardType: 'visa',
        isDefault: true,
        customerPaymentProfileId: 'cpp_mock_001',
      },
      {
        id: 'pm_mock_002',
        type: 'CC',
        lastFour: '8888',
        cardType: 'mastercard',
        isDefault: false,
        customerPaymentProfileId: 'cpp_mock_002',
      },
      {
        id: 'pm_mock_003',
        type: 'ACH',
        lastFour: '6789',
        accountType: 'Checking',
        isDefault: false,
        customerPaymentProfileId: 'cpp_mock_003',
      },
    ];

    // Simulate API delay
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next(mockData);
        observer.complete();
      }, 500); // 500ms delay to simulate network request
    });
  }

  /**
   * Get detailed information about a specific payment method for editing
   * Sensitive data should be masked (e.g., ****1234)
   */
  getPaymentMethodDetails(
    paymentMethodId: string
  ): Observable<PaymentMethodDetails> {
    // TODO: Remove mock data when backend is ready
    const USE_MOCK_DATA = true; // Set to false when backend is implemented

    if (USE_MOCK_DATA) {
      return this.getMockPaymentMethodDetails(paymentMethodId);
    }

    return this.http.get<PaymentMethodDetails>(
      `${this.apiUrl}/payment-method/${paymentMethodId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Mock payment method details for development/testing
   */
  private getMockPaymentMethodDetails(
    paymentMethodId: string
  ): Observable<PaymentMethodDetails> {
    const mockDetailsMap: { [key: string]: PaymentMethodDetails } = {
      pm_mock_001: {
        id: 'pm_mock_001',
        type: 'CC',
        firstName: 'John',
        lastName: 'Doe',
        nameOnCard: 'John Doe',
        expirationDate: '12/25',
        maskedCardNumber: '************4242',
        address: {
          streetAddress1: '123 Main St',
          streetAddress2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          zip: '10001',
        },
      },
      pm_mock_002: {
        id: 'pm_mock_002',
        type: 'CC',
        firstName: 'Jane',
        lastName: 'Smith',
        nameOnCard: 'Jane Smith',
        expirationDate: '06/26',
        maskedCardNumber: '************8888',
        address: {
          streetAddress1: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001',
        },
      },
      pm_mock_003: {
        id: 'pm_mock_003',
        type: 'ACH',
        accountType: 'Checking',
        maskedRoutingNumber: '*****6789',
        maskedAccountNumber: '*********6789',
        address: {
          streetAddress1: '789 Pine Road',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
        },
      },
    };

    const details =
      mockDetailsMap[paymentMethodId] || mockDetailsMap['pm_mock_001'];

    // Simulate API delay
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next(details);
        observer.complete();
      }, 300);
    });
  }

  /**
   * Update existing payment method
   * Only non-sensitive fields can be updated (address, expiration date, name)
   */
  updatePaymentMethod(
    paymentMethodId: string,
    organizationId: number,
    customerProfileData: CustomerProfileData,
    paymentData: any,
    paymentType: 'ACH' | 'CC'
  ): Observable<any> {
    // TODO: Remove mock data when backend is ready
    const USE_MOCK_DATA = true; // Set to false when backend is implemented

    if (USE_MOCK_DATA) {
      return this.getMockUpdateResponse(paymentMethodId);
    }

    const updateData: any = {
      paymentMethodId,
      organizationId,
      customerProfileData,
      paymentType,
    };

    if (paymentType === 'CC') {
      // Only allow updating certain fields for credit cards
      updateData.CCPaymentProfileData = {
        firstName: paymentData.firstName,
        lastName: paymentData.lastName,
        expirationDate: paymentData.expirationDate,
        address: paymentData.address,
        // Include CVV if provided for verification
        ...(paymentData.cvv && { cvv: paymentData.cvv }),
      };
    } else if (paymentType === 'ACH') {
      // For ACH, only allow updating account type and address
      updateData.ACHPaymentProfileData = {
        accountType: paymentData.accountType,
        address: paymentData.address,
      };
    }

    return this.http.put<any>(
      `${this.apiUrl}/payment-method/${paymentMethodId}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Mock update response for development/testing
   */
  private getMockUpdateResponse(paymentMethodId: string): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next({
          success: true,
          message: 'Payment method updated successfully',
          paymentMethodId: paymentMethodId,
        });
        observer.complete();
      }, 500);
    });
  }

  /**
   * Delete a payment method
   * Backend should prevent deletion of default payment method
   */
  deletePaymentMethod(paymentMethodId: string): Observable<any> {
    // TODO: Remove mock data when backend is ready
    const USE_MOCK_DATA = true; // Set to false when backend is implemented

    if (USE_MOCK_DATA) {
      return this.getMockDeleteResponse(paymentMethodId);
    }

    return this.http.delete<any>(
      `${this.apiUrl}/payment-method/${paymentMethodId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Mock delete response for development/testing
   */
  private getMockDeleteResponse(paymentMethodId: string): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next({
          success: true,
          message: 'Payment method deleted successfully',
          paymentMethodId: paymentMethodId,
        });
        observer.complete();
      }, 500);
    });
  }

  /**
   * Set a payment method as the default
   * Backend should update the user's default payment method
   */
  setDefaultPaymentMethod(paymentMethodId: string): Observable<any> {
    // TODO: Remove mock data when backend is ready
    const USE_MOCK_DATA = true; // Set to false when backend is implemented

    if (USE_MOCK_DATA) {
      return this.getMockSetDefaultResponse(paymentMethodId);
    }

    return this.http.patch<any>(
      `${this.apiUrl}/payment-method/${paymentMethodId}/set-default`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Mock set default response for development/testing
   */
  private getMockSetDefaultResponse(paymentMethodId: string): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next({
          success: true,
          message: 'Default payment method updated',
          paymentMethodId: paymentMethodId,
        });
        observer.complete();
      }, 500);
    });
  }

  /**
   * Verify a payment method (useful for ACH micro-deposit verification)
   */
  verifyPaymentMethod(
    paymentMethodId: string,
    verificationData?: any
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/payment-method/${paymentMethodId}/verify`,
      verificationData || {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get payment method by customer payment profile ID (for Authorize.Net)
   */
  getPaymentMethodByProfileId(
    customerPaymentProfileId: string
  ): Observable<PaymentMethodDetails> {
    return this.http.get<PaymentMethodDetails>(
      `${this.apiUrl}/payment-profile/${customerPaymentProfileId}`,
      { headers: this.getHeaders() }
    );
  }
}
