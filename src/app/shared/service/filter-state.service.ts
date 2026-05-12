import { Injectable } from '@angular/core';

export const FILTER_KEY = 'dashboard_filters';

@Injectable({ providedIn: 'root' })
export class FilterStateService {
  save(filters: Record<string, any>): void {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters));
  }

  load(): Record<string, any> | null {
    const raw = sessionStorage.getItem(FILTER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  clear(): void {
    sessionStorage.removeItem(FILTER_KEY);
  }
}
