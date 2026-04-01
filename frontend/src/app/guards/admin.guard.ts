import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allow = (isAdmin?: boolean) => {
    if (isAdmin) return true;
    return router.createUrlTree(['/profile'], {
      queryParams: { reason: 'admin', returnUrl: state.url }
    });
  };

  if (auth.user()) {
    return allow(auth.user()?.is_admin);
  }

  return auth.loadProfile().pipe(
    map((profile) => allow(profile?.is_admin)),
    catchError(() => of(router.createUrlTree(['/profile'], {
      queryParams: { reason: 'admin', returnUrl: state.url }
    })))
  );
};
