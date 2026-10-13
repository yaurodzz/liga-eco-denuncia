import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Unsubscribe,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  Denuncia,
  DenunciaForm,
  ResultadoValidacao,
  StatusDenuncia,
  TipoDenuncia,
} from '../models/denuncia.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DenunciaService {
  private authSvc = inject(AuthService);
  private unsub?: Unsubscribe;

  // ---------- estado ----------
  readonly denuncias = signal<Denuncia[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly filtro = signal<TipoDenuncia | 'todas'>('todas');

  // ---------- derivados (filtros e totais ficam aqui, não no HTML) ----------
  readonly filtradas = computed(() => {
    const f = this.filtro();
    const lista = this.denuncias();
    return f === 'todas' ? lista : lista.filter((d) => d.tipo === f);
  });

  readonly totais = computed(() => {
    const lista = this.denuncias();
    const porTipo: Record<TipoDenuncia, number> = { agua: 0, ar: 0, solo: 0, outros: 0 };
    lista.forEach((d) => porTipo[d.tipo]++);
    return {
      total: lista.length,
      semFoto: lista.filter((d) => !d.fotoUrl).length,
      semLocal: lista.filter((d) => !d.localTexto).length,
      porTipo,
    };
  });

  // ---------- leitura em tempo real ----------
  escutar(): void {
    if (this.unsub) return;
    this.carregando.set(true);
    const q = query(collection(db, 'denuncias'), orderBy('criadoEm', 'desc'));
    this.unsub = onSnapshot(
      q,
      (snap) => {
        this.denuncias.set(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Denuncia) })));
        this.carregando.set(false);
        this.erro.set(null);
      },
      (e) => {
        console.error(e);
        this.erro.set('Não foi possível carregar o mural. Verifique as regras do Firestore.');
        this.carregando.set(false);
      },
    );
  }

  parar(): void {
    this.unsub?.();
    this.unsub = undefined;
    this.denuncias.set([]);
  }

  async obter(id: string): Promise<Denuncia | null> {
    const snap = await getDoc(doc(db, 'denuncias', id));
    return snap.exists() ? { id: snap.id, ...(snap.data() as Denuncia) } : null;
  }

  // ---------- REGRA DO TEMA (tela 2 do print) ----------
  // Foto e local são obrigatórios. Sem eles, o envio é bloqueado e a mensagem aparece na tela.
  validarEnvio(f: DenunciaForm): ResultadoValidacao {
    const faltando: string[] = [];
    if (!f.titulo.trim()) faltando.push('título');
    if (!f.tipo) faltando.push('tipo');
    if (!f.temFoto) faltando.push('foto');
    const temLocal = !!f.localTexto.trim() || (f.lat !== null && f.lng !== null);
    if (!temLocal) faltando.push('local');

    return {
      ok: faltando.length === 0,
      faltando,
      mensagem: faltando.length ? `Envio bloqueado: inclua ${this.juntar(faltando)}` : '',
    };
  }

  private juntar(itens: string[]): string {
    if (itens.length === 1) return itens[0];
    return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
  }

  // ---------- permissões ----------
  podeEditar(d: Denuncia): boolean {
    return this.authSvc.isAdmin() || d.autorId === this.authSvc.usuario()?.uid;
  }

  apoiou(d: Denuncia): boolean {
    const uid = this.authSvc.usuario()?.uid;
    return !!uid && (d.apoiadores ?? []).includes(uid);
  }

  // ---------- escrita ----------
  async criar(f: DenunciaForm, fotoUrl: string): Promise<string> {
    const u = auth.currentUser;
    if (!u) throw new Error('Faça login para enviar.');
    const v = this.validarEnvio({ ...f, temFoto: !!fotoUrl });
    if (!v.ok) throw new Error(v.mensagem);

    const ref = await addDoc(collection(db, 'denuncias'), {
      titulo: f.titulo.trim(),
      tipo: f.tipo,
      descricao: f.descricao.trim(),
      fotoUrl,
      localTexto: this.textoLocal(f),
      lat: f.lat,
      lng: f.lng,
      status: 'aberta' as StatusDenuncia,
      autorId: u.uid,
      autorNome: this.authSvc.perfil()?.nome ?? u.displayName ?? 'Anônimo',
      apoiadores: [],
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
    return ref.id;
  }

  async atualizar(id: string, f: DenunciaForm, fotoUrl: string, status?: StatusDenuncia): Promise<void> {
    const v = this.validarEnvio({ ...f, temFoto: !!fotoUrl });
    if (!v.ok) throw new Error(v.mensagem);

    const dados: Record<string, unknown> = {
      titulo: f.titulo.trim(),
      tipo: f.tipo,
      descricao: f.descricao.trim(),
      fotoUrl,
      localTexto: this.textoLocal(f),
      lat: f.lat,
      lng: f.lng,
      atualizadoEm: serverTimestamp(),
    };
    if (status && this.authSvc.isAdmin()) dados['status'] = status; // só admin muda status
    await updateDoc(doc(db, 'denuncias', id), dados);
  }

  async excluir(id: string): Promise<void> {
    await deleteDoc(doc(db, 'denuncias', id));
  }

  /** Ação do "+" do print: apoiar / desfazer apoio. */
  async alternarApoio(d: Denuncia): Promise<void> {
    const uid = this.authSvc.usuario()?.uid;
    if (!uid || !d.id) return;
    await updateDoc(doc(db, 'denuncias', d.id), {
      apoiadores: this.apoiou(d) ? arrayRemove(uid) : arrayUnion(uid),
    });
  }

  private textoLocal(f: DenunciaForm): string {
    const t = f.localTexto.trim();
    if (t) return t;
    return f.lat !== null && f.lng !== null ? `${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}` : '';
  }
}
