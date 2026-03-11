import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.checked()) {
    return auth.isLoggedIn() ? true : router.createUrlTree(['/auth/login']); // ✅ fixed path
  }

  return auth.checkAuth().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/auth/login']))), // ✅ fixed path
  );
};
