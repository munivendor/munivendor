import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private messageSubject = new BehaviorSubject<string>('Loading...');
  private activeRequests = 0;

  public loading$ = this.loadingSubject.asObservable();
  public message$ = this.messageSubject.asObservable();

  show(message: string = 'Loading...'): void {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.messageSubject.next(message);
      this.loadingSubject.next(true);
    }
  }

  hide(message?: string): void {
    try {
      if (message) {
        console.log('message', message);
      }
      this.activeRequests--;
      if (this.activeRequests <= 0) {
        this.activeRequests = 0;
        this.loadingSubject.next(false);
        this.messageSubject.next('Loading...');
      }
    } catch (err) {
      console.error('Error in LoadingService.hide:', err);
    }
  }

  forceHide(): void {
    this.activeRequests = 0;
    this.loadingSubject.next(false);
    this.messageSubject.next('Loading...');
  }
}
