import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { Chat } from './features/chat/chat';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'chats',
        pathMatch: 'full',
      },
      {
        path: 'chats',
        loadComponent: () => import('./features/chat/chat').then((m) => m.Chat),
      },  
      {
        path: 'search',
        loadComponent: () => import('./features/search/search').then((m) => m.Search),
      },  
      {
        path: 'settings',
        loadComponent: () => import('./features/setting/setting').then((m) => m.Setting),
      },  
      {
        path: 'requests',
        loadComponent: () => import('./features/request/request').then((m) => m.Request),
      },  
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },  
      {
        path: 'calls',
        loadComponent: () => import('./features/call/call').then((m) => m.Call),
      },  
    ],
  },
  {
    path: '**',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
];
