import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routerReducer, provideRouterStore } from '@ngrx/router-store';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { environment } from '@/environments/environment';
import { userFeature } from './core/store/user/user.reducer';
import { UserEffects } from './core/store/user/user.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions()
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideStore({
      router: routerReducer,
    }),
    provideRouterStore(),
    provideEffects(),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: environment.production,
    }),
    provideState(userFeature),
    provideEffects(UserEffects),
  ]
};
