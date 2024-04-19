import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DecisionMakerService {
  getDecisionMarkers(): string[] {
    return ['Joshua Weiss', 'Indira', 'Rajib'];
  }
}