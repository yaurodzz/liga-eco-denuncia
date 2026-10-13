import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Só deixa passar quem está logado; senão vai para /login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.pronto;
  return auth.usuario() ? true : router.createUrlTree(['/login']);
};

/** Quem já está logado não precisa ver o login. */
export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.pronto;
  return auth.usuario() ? router.createUrlTree(['/lista']) : true;
};
