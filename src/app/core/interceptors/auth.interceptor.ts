import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastrService);

  // ✅ attach cookies to every request
  const request = req.clone({
    withCredentials: true,
  });

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {

      switch (err.status) {
        case 401:
          router.navigate(['/auth/login']);
          break;
        case 403:
          toast.error('You do not have permission');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 422:
          toast.error(err.error?.message ?? 'Validation error');
          break;
        case 500:
          toast.error('Server error. Please try again');
          break;
        case 0:
          toast.error('No internet connection');
          break;
        default:
          toast.error(err.error?.message ?? 'Something went wrong');
      }

      return throwError(() => err);
    })
  );
};