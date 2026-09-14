import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

export interface FeatureFlagResponse {
  feature: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private get url(): string {
    return this.config.apiUrl;
  }

  // Cache in-flight/completed lookups per feature name so multiple
  // components asking about the same flag in the same session only
  // trigger a single request.
  private flagCache = new Map<string, Observable<boolean>>();

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {}

  /**
   * Returns whether the given feature flag is enabled. Fails "closed" to
   * `false` on any error so a feature-flag service outage can never
   * unexpectedly turn on a feature (e.g. re-enable autofill) in prod.
   */
  isEnabled(featureName: string): Observable<boolean> {
    if (!this.flagCache.has(featureName)) {
      const request$ = this.http
        .get<FeatureFlagResponse>(`${this.url}FeatureFlags/${featureName}`)
        .pipe(
          map((response) => !!response?.enabled),
          catchError(() => of(false)),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      this.flagCache.set(featureName, request$);
    }

    return this.flagCache.get(featureName)!;
  }
}
