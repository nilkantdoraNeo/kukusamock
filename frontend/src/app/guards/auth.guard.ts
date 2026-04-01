import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  if (!token) {
    return router.createUrlTree(['/profile'], {
      queryParams: { reason: 'auth', returnUrl: state.url }
    });
  }

  if (auth.user()) {
    return true;
  }

  return auth.loadProfile().pipe(
    map(() => true),
    catchError(() => {
      auth.logout();
      return of(router.createUrlTree(['/profile'], {
        queryParams: { reason: 'auth', returnUrl: state.url }
      }));
    })
  );
};
