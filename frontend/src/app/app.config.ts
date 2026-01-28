import type { ApplicationConfig } from "@angular/core"
import { provideRouter } from "@angular/router"
import { provideHttpClient, withInterceptors } from "@angular/common/http"
import { provideAnimations } from "@angular/platform-browser/animations"
import { routes } from "./app.routes"
import { authInterceptor } from "./core/interceptors/auth.interceptor"

import { provideNgxStripe } from 'ngx-stripe';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    provideNgxStripe(environment.stripePublishableKey)
  ],
}
