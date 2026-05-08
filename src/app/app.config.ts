import {
  ApplicationConfig,
  ErrorHandler,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  SocialAuthService,
  SocialAuthServiceConfig,
} from '@abacritt/angularx-social-login';
import { GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { AuthService } from './authorization/auth.service';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './exceptionhandling/global-error-handler';
import { WithCredentialsInterceptor } from './core/interceptors/with-credentials.interceptor';
import { ErrorHandlerInterceptor } from './core/interceptors/error-handler.interceptor';
import { ConfigService } from './core/services/config.service';

const CLIENT_ID =
  '954795010792-oafduvq9mhtlatg68rhl4hadtcuajos6.apps.googleusercontent.com';

// ConfigService injected here so auth can safely use apiUrl at init time
function initializeApp(
  authService: AuthService,
  configService: ConfigService,
): () => Promise<any> {
  return (): Promise<any> =>
    configService.loadStaticConfig().then(() => {
      return authService.initializeApp().toPromise();
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideAnimationsAsync('noop'),

    SocialAuthService,
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(CLIENT_ID),
          },
        ],
      } as SocialAuthServiceConfig,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService, ConfigService],
      multi: true,
    },

    {
      provide: HTTP_INTERCEPTORS,
      useClass: WithCredentialsInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorHandlerInterceptor,
      multi: true,
    },
  ],
};
