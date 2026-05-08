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

  async loadStaticConfig(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.config = {
        apiUrl: '/api/',
        disableAuthGuard: false,
        appInsights: { connectionString: '' },
      };
      return Promise.resolve();
    }

    try {
      const config = await firstValueFrom(
        this.http.get<AppConfig>(`/assets/config.json?v=${Date.now()}`),
      );
      this.config = config;
    } catch {
      this.config = {
        apiUrl: '/api/',
        disableAuthGuard: false,
        appInsights: { connectionString: '' },
      };
    }
  }

  get apiUrl(): string {
    return this.config?.apiUrl ?? '';
  }
}
