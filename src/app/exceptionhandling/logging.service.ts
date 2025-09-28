// logging.service.ts
import { Injectable } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private appInsights: ApplicationInsights;

  constructor() {
    this.appInsights = new ApplicationInsights({
      config: {
        connectionString: environment.appInsights.connectionString,
        enableAutoRouteTracking: true,
        enableUnhandledPromiseRejectionTracking: true
      }
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
    this.appInsights.trackException({
      exception: error, severityLevel, properties:
      {
        userId: additionalProps?.userId,
        methodName: additionalProps.methodName,
        className: additionalProps.className,
        operation: additionalProps.operation
      }
    });

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