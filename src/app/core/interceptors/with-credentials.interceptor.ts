import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class WithCredentialsInterceptor implements HttpInterceptor {
  private readonly credentialPaths: string[] = [
    '/Requests',
    '/CategoryHierarchy',
    '/AuthorizingOfficials',
    '/AuthorizingOfficials/organization',
    '/organizations',
  ];

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Check if the URL matches one of the credential-required paths
    const needsCredentials = this.credentialPaths.some((path) =>
      req.url.includes(path)
    );

    // Clone the request with credentials if needed
    const authReq = needsCredentials
      ? req.clone({ withCredentials: true })
      : req;

    return next.handle(authReq);
  }
}
