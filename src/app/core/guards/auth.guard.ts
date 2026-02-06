import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Already checked → no extra API call
  if (auth.checked()) {
    return auth.isLoggedIn()
      ? true
      : router.createUrlTree(['/login']);
  }

  // First load → ask backend
  return auth.checkAuth().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
