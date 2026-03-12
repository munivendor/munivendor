import { ErrorHandler, Injectable } from '@angular/core';
import { LoggingService } from './logging.service';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private logger: LoggingService) {}

  handleError(error: any): void {
    const unwrapped = error?.ngOriginalError ?? error;
    if (unwrapped instanceof HttpErrorResponse) {
      console.error('Global error caught (HTTP, skipped):', unwrapped);
      return;
    }

    this.logger.logException(
      unwrapped instanceof Error ? unwrapped : new Error(String(unwrapped)),
      3,
      {
        source: 'GlobalErrorHandler',
        url: typeof window !== 'undefined' ? window.location.href : 'ssr',
      },
    );

    console.error('Global error caught:', unwrapped);
  }
}
