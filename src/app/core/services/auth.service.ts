import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private user = signal<any>(null);
  checked  = signal<boolean>(false);

  constructor(private http: HttpClient) { }

  checkAuth() {
    return this.http.get<any>('/auth/me', {
      withCredentials: true,
    }).pipe(
      tap(res => {
        this.user.set(res.user);
        this.checked.set(true);
      }),
      map(() => true)
    );
  }

  logout() {
    return this.http.post('/auth/logout', {}, {
      withCredentials: true,
    }).pipe(
      tap(() => {
        this.user.set(null);
      })
    );
  }

  isLoggedIn(): boolean {
    return !!this.user();
  }
}
