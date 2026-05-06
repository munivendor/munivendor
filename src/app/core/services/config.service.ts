// src/app/core/services/config.service.ts
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  apiUrl: string;
  disableAuthGuard: boolean;
  appInsights: {
    connectionString: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config!: AppConfig;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  load(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.config = {
        apiUrl: '/api/',
        disableAuthGuard: false,
        appInsights: { connectionString: '' },
      };
      return Promise.resolve();
    }

    return firstValueFrom(
      this.http.get<AppConfig>(`/assets/config.json?v=${Date.now()}`),
    )
      .then((config) => {
        this.config = config;
      })
      .catch(() => {
        console.error('Failed to load config.json');
        this.config = {
          apiUrl: '/api/',
          disableAuthGuard: false,
          appInsights: { connectionString: '' },
        };
      });
  }

  get apiUrl(): string {
    return this.config?.apiUrl ?? '';
  }
}
