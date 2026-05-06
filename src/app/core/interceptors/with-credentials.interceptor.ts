import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

@Injectable()
export class WithCredentialsInterceptor implements HttpInterceptor {
  private readonly publicPaths: string[] = [
    '/auth/send-reset',
    '/auth/reset-password',
    '/users/validate',
  ];

  constructor(private config: ConfigService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const isApiRequest = req.url.startsWith(this.config.apiUrl);
    const isPublicEndpoint = this.publicPaths.some((path) =>
      req.url.includes(path),
    );

    const needsCredentials = isApiRequest && !isPublicEndpoint;

    const authReq = needsCredentials
      ? req.clone({ withCredentials: true })
      : req;

    return next.handle(authReq);
  }
}
