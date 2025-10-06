// logging.service.ts
import { Injectable } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { environment } from '../../environments/environment';
import { request } from 'http';
import { Organization } from '../Organization/Details/model/organization.model';

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private appInsights: ApplicationInsights;

  constructor() {
    this.appInsights = new ApplicationInsights({
      config: {
        connectionString: environment.appInsights.connectionString,
        enableAutoRouteTracking: true,
        enableUnhandledPromiseRejectionTracking: true,
      },
    });
    this.appInsights.loadAppInsights();
  }

  logPageView(name?: string, uri?: string) {
    this.appInsights.trackPageView({ name, uri });
  }

  logEvent(name: string, properties?: { [key: string]: any }) {
    this.appInsights.trackEvent({ name }, properties);
  }

  logException(error: Error, severityLevel = 3, additionalProps?: any) {
    try {
      const props = additionalProps ?? {};

      this.appInsights.trackException({
        exception: error instanceof Error ? error : new Error(String(error)),
        severityLevel,
        properties: {
          userId: props?.userId ?? null,
          requestId: props?.requestId ?? null,
          organizationId: props?.organizationId ?? null,
          methodName: props?.methodName ?? 'unknown',
          className: props?.className ?? 'unknown',
          operation: props?.operation ?? null,
          correlationId: props?.correlationId ?? null,
        },
      });
    } catch (ex) {
      // Ensure logging never throws
      try {
        console.error('LoggingService - failed to log exception', ex, {
          error,
          additionalProps,
        });
      } catch {
        // swallow silently as a last resort
      }
    }
  }

  logTrace(message: string) {
    this.appInsights.trackTrace({ message });
  }

  /**
   * Set user context for tracking
   */
  setUserContext(userId: string, accountId?: string): void {
    this.appInsights.setAuthenticatedUserContext(userId, accountId, true);
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    this.appInsights.clearAuthenticatedUserContext();
  }

  /**
   * Get additional properties for logging
   
  private getAdditionalProperties(): { [key: string]: any } {
    return {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      environment: environment.,
      version: environment.version
    };
  }*/
}
