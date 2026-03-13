import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API } from '../config/api';

@Injectable({ providedIn: 'root' })
export class AppService {
  constructor(private http: HttpClient) {}

  private handleError = (error: unknown) => {
    console.error('API Error:', error);
    return throwError(() => error);
  };

  get<T>(url: string, params?: Record<string, any>): Observable<T> {
    return this.http
      .get<T>(`${API.domain}${url}`, {
        params,
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  post<T>(url: string, body?: unknown): Observable<T> {
    return this.http
      .post<T>(`${API.domain}${url}`, body ?? {}, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  patch<T>(url: string, body?: unknown): Observable<T> {
    return this.http
      .patch<T>(`${API.domain}${url}`, body ?? {}, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  delete<T>(url: string, params?: Record<string, any>): Observable<T> {
    return this.http
      .delete<T>(`${API.domain}${url}`, {
        params,
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  uploadWithProgress<T>(url: string, body: FormData) {
    return this.http.post<T>(`${API.domain}${url}`, body, {
      reportProgress: true,
      observe: 'events',
      withCredentials: true,
    });
  }
}
