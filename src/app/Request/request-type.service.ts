import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CountryService {
  getCountries(): string[] {
    return ['USA', 'Canada', 'India'];
  }

  getStatesByCountry(country: string): string[] {
    // Simulating state data based on the selected country
    switch (country) {
      case 'USA':
        return ['New York', 'California', 'Texas'];
      case 'Canada':
        return ['Ontario', 'British Columbia', 'Quebec'];
      case 'India':
        return ['Delhi', 'Maharashtra', 'Karnataka'];
      default:
        return [];
    }
  }
}