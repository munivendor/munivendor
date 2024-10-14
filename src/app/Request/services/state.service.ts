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


  private requestIdSource = new BehaviorSubject<number | null>(null); // BehaviorSubject holds the latest requestId
  currentRequestId$ = this.requestIdSource.asObservable(); // Observable for components to subscribe

  setRequestId(requestId: number) {
    console.log("im here", requestId)
    this.requestIdSource.next(requestId); // Emit the new requestId value
  }

  getRequestId(): number | null {
    return this.requestIdSource.getValue(); // Get the current value of the requestId
  }
}
