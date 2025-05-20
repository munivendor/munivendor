import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private myComponentState: any;

  private userIdSource = new BehaviorSubject<number | null>(null);
  currentUserId$ = this.userIdSource.asObservable();

  private requestIdSource = new BehaviorSubject<number | null>(null);
  currentRequestId$ = this.requestIdSource.asObservable();
    
  private requestHasBeenSaved = new BehaviorSubject<boolean>(false);
  currentRequestHasBeenSaved$ = this.requestHasBeenSaved.asObservable();

  private organizationIdSource = new BehaviorSubject<number | null>(null);
  currentOrganizationId$ = this.organizationIdSource.asObservable();

  saveState(state: any) {
    this.myComponentState = state;
  }

  getState() {
    return this.myComponentState;
  }

  setUserId(userId: number) {
    this.userIdSource.next(userId);
  }

  getUserId(): number | null {
    return this.userIdSource.getValue();
  }

  setRequestId(requestId: number) {
    this.requestIdSource.next(requestId);
  }

  getRequestId(): number | null {
    return this.requestIdSource.getValue();
  }

  setRequestHasBeenSaved(hasBeenSaved: boolean) {
    this.requestHasBeenSaved.next(hasBeenSaved);
  }
  
  getRequestHasBeenSaved(): boolean {
    return this.requestHasBeenSaved.getValue();
  }
  
  setOrganizationId(organizationId: number) {
    this.organizationIdSource.next(organizationId);
  }

  getOrganizationId(): number | null {
    return this.organizationIdSource.getValue();
  }
}
