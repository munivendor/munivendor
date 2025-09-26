// global-error-handler.ts
import { ErrorHandler, Injectable } from '@angular/core';
import { LoggingService } from './logging.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private logger: LoggingService) {}

  handleError(error: any): void {
    this.logger.logException(error instanceof Error ? error : new Error(error));
    console.error('Global error caught:', error);
  }
}