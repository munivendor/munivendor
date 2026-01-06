import { Injectable } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { environment } from '../../environments/environment';
import { StateService } from '../Request/services/state.service';

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private appInsights: ApplicationInsights;

  constructor(private stateService: StateService) {
    this.appInsights = new ApplicationInsights({
      config: {
        connectionString: environment.appInsights.connectionString,
        enableAutoRouteTracking: true,
        enableUnhandledPromiseRejectionTracking: true,
      },
    });

    this.stateService.currentUserId$.subscribe((userId) => {
      if (userId != null) {
        this.appInsights.setAuthenticatedUserContext(String(userId));
      } else {
        this.appInsights.clearAuthenticatedUserContext();
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

  logException(error: Error, severityLevel = 3, customProps?: any) {
    try {
      const filteredProps = Object.fromEntries(
        Object.entries(customProps ?? {}).filter(([_, value]) => value != null)
      );

      this.appInsights.trackException({
        exception: error instanceof Error ? error : new Error(String(error)),
        severityLevel,
        properties: filteredProps,
      });
    } catch (e) {
      console.error('Failed to log exception:', e);
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
