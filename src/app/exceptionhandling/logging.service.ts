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
        instrumentationKey: environment.appInsights.instrumentationKey,
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

  logException(error: Error, severityLevel = 3) {
    this.appInsights.trackException({ exception: error, severityLevel });
  }

  logTrace(message: string) {
    this.appInsights.trackTrace({ message });
  }
}