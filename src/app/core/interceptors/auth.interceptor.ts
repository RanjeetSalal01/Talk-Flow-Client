import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Attach cookies to every request
  const request = req.clone({
    withCredentials: true,
  });

  return next(request);
};
