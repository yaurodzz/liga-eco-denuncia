import { Injectable, computed, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Perfil } from '../models/perfil.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuario = signal<User | null>(null);
  readonly perfil = signal<Perfil | null>(null);
  readonly isAdmin = computed(() => this.perfil()?.role === 'admin');

  /** Resolve quando o Firebase terminou de restaurar a sessão (usado pelos guards). */
  readonly pronto: Promise<void>;

  /** true enquanto `cadastrar()` roda: ele mesmo cria o perfil, com o nome digitado. */
  private cadastrando = false;

  constructor() {
    this.pronto = new Promise<void>((resolve) => {
      onAuthStateChanged(auth, async (u) => {
        this.usuario.set(u);
        if (this.cadastrando) { // o Firebase avisa "logou" ANTES do updateProfile; evita criar perfil sem nome
          resolve();
          return;
        }
        try {
          this.perfil.set(u ? await this.carregarPerfil(u) : null);
        } catch (e) {
          console.error('Falha ao carregar perfil', e);
          this.perfil.set(null);
        }
        resolve();
      });
    });
  }

  async cadastrar(nome: string, email: string, senha: string): Promise<void> {
    this.cadastrando = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(cred.user, { displayName: nome });
      try {
        this.perfil.set(await this.carregarPerfil(cred.user, nome));
      } catch (e) {
        // conta criada; o perfil será recriado no próximo carregamento (confira se as regras do Firestore foram publicadas)
        console.error('Falha ao criar perfil', e);
      }
      this.usuario.set(auth.currentUser);
    } finally {
      this.cadastrando = false;
    }
  }

  async entrar(email: string, senha: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, senha);
  }

  async entrarComGoogle(): Promise<void> {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async sair(): Promise<void> {
    await signOut(auth);
  }

  /** Lê `usuarios/{uid}`; se não existir, cria com role "user". Admin só pelo Console. */
  private async carregarPerfil(u: User, nomeOverride?: string): Promise<Perfil> {
    const ref = doc(db, 'usuarios', u.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as Perfil;

    const novo: Perfil = {
      uid: u.uid,
      nome: nomeOverride || u.displayName || (u.email ?? 'Usuário').split('@')[0],
      email: u.email ?? '',
      role: 'user',
    };
    await setDoc(ref, novo);
    return novo;
  }
}

/** Traduz códigos de erro do Firebase Auth para mensagens claras. */
export function mensagemErroAuth(e: any): string {
  switch (e?.code) {
    case 'auth/invalid-email': return 'E-mail inválido.';
    case 'auth/missing-password': return 'Informe a senha.';
    case 'auth/weak-password': return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/email-already-in-use': return 'Este e-mail já tem cadastro. Use "Entrar".';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'E-mail ou senha incorretos.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return 'Login com Google cancelado.';
    case 'auth/popup-blocked': return 'O navegador bloqueou o pop-up do Google. Libere e tente de novo.';
    case 'auth/too-many-requests': return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    case 'auth/network-request-failed': return 'Sem conexão. Verifique a internet.';
    default: return 'Não foi possível concluir. Tente novamente.';
  }
}
