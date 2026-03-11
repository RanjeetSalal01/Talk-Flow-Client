import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, of } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // ✅ already checked — no extra API call
  if (auth.checked()) {
    return auth.isLoggedIn()
      ? router.createUrlTree(['/']) // ✅ logged in → go to chats
      : true; // ✅ not logged in → allow login/register page
  }

  // first load
  return auth.checkAuth().pipe(
    map(() => router.createUrlTree(['/'])), // ✅ logged in → chats
    catchError(() => of(true)), // not logged in → allow
  );
};
