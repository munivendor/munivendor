import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private myComponentState: any;

  saveState(state: any) {
    this.myComponentState = state;
  }

  getState() {
    return this.myComponentState;
  }


  private requestIdSource = new BehaviorSubject<number | null>(null);
  currentRequestId$ = this.requestIdSource.asObservable();

  setRequestId(requestId: number) {
    this.requestIdSource.next(requestId);
  }

  getRequestId(): number | null {
    return this.requestIdSource.getValue();
  }
}
