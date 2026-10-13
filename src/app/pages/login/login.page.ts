import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonHeader, IonIcon, IonInput, IonLabel,
  IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logoGoogle } from 'ionicons/icons';
import { AuthService, mensagemErroAuth } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner
],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  modo = signal<'entrar' | 'cadastrar'>('entrar');
  nome = signal('');
  email = signal('');
  senha = signal('');
  erro = signal('');
  carregando = signal(false);

  constructor() {
    addIcons({ logoGoogle });
  }

  trocarModo(m: unknown): void {
    this.modo.set(m === 'cadastrar' ? 'cadastrar' : 'entrar');
    this.erro.set('');
  }

  async enviar(): Promise<void> {
    if (this.carregando()) return;
    this.erro.set('');

    if (this.modo() === 'cadastrar' && !this.nome().trim()) {
      this.erro.set('Informe seu nome.');
      return;
    }
    if (!this.email().trim() || !this.senha()) {
      this.erro.set('Informe e-mail e senha.');
      return;
    }

    this.carregando.set(true);
    try {
      if (this.modo() === 'cadastrar') {
        await this.auth.cadastrar(this.nome().trim(), this.email().trim(), this.senha());
      } else {
        await this.auth.entrar(this.email().trim(), this.senha());
      }
      await this.auth.pronto;
      this.router.navigateByUrl('/lista', { replaceUrl: true });
    } catch (e) {
      this.erro.set(mensagemErroAuth(e));
    } finally {
      this.carregando.set(false);
    }
  }

  async google(): Promise<void> {
    if (this.carregando()) return;
    this.erro.set('');
    this.carregando.set(true);
    try {
      await this.auth.entrarComGoogle();
      await this.auth.pronto;
      this.router.navigateByUrl('/lista', { replaceUrl: true });
    } catch (e) {
      this.erro.set(mensagemErroAuth(e));
    } finally {
      this.carregando.set(false);
    }
  }
}
