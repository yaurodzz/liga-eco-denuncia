export type PapelUsuario = 'user' | 'admin';

/** Documento da coleção `usuarios` (id = uid do Authentication) */
export interface Perfil {
  uid: string;
  nome: string;
  email: string;
  role: PapelUsuario;
}
