import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  // rota vazia -> /lista; o authGuard manda para /login se não houver sessão
  { path: '', redirectTo: 'lista', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'lista',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/lista/lista.page').then((m) => m.ListaPage),
  },
  {
    path: 'denuncia/nova',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/nova-denuncia/nova-denuncia.page').then((m) => m.NovaDenunciaPage),
  },
  {
    path: 'denuncia/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/nova-denuncia/nova-denuncia.page').then((m) => m.NovaDenunciaPage),
  },
  { path: '**', redirectTo: 'lista' },
];
