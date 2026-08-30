import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  {
    path: 'intakes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./intakes/intakes-page').then((m) => m.IntakesPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/launcher').then((m) => m.Launcher),
  },
  { path: '**', redirectTo: '' },
];