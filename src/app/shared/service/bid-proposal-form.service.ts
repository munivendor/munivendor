// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from '../../../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class BidProposalFormService {
//   private url = environment.apiUrl;

//   constructor(private http: HttpClient) { }

//   GetBidProposal(bidId: number): Observable<any> {
//     return this.http.get(`${this.url}Requests/Bids/bid/${bidId}`);
//   }

//   SaveBidProposal(bidData: any): Observable<any> {
//     return this.http.post(`${this.url}Requests/Bids`, bidData);
//   }

//   UpdateBidProposal(bidData: any): Observable<any> {
//     return this.http.put(`${this.url}Requests/Bids/`, bidData);
//   }
// }