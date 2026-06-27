import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Launcher } from './home/launcher';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'home', component: Launcher, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
