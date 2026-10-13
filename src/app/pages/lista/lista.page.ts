import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController, IonButton, IonButtons, IonContent, IonFooter, IonHeader,
  IonSpinner, IonTitle, IonToolbar, NavController, ToastController,
} from '@ionic/angular';
import { DenunciaCardComponent } from '../../components/denuncia-card/denuncia-card.component';
import { Denuncia, TIPOS } from '../../models/denuncia.model';
import { AuthService } from '../../services/auth.service';
import { DenunciaService } from '../../services/denuncia.service';

@Component({
  selector: 'app-lista',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonSpinner,
    DenunciaCardComponent
],
  templateUrl: './lista.page.html',
  styleUrls: ['./lista.page.scss'],
})
export class ListaPage implements OnInit {
  svc = inject(DenunciaService);
  auth = inject(AuthService);
  private router = inject(Router);
  private nav = inject(NavController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  readonly tipos = TIPOS;

  ngOnInit(): void {
    this.svc.escutar();
  }

  rotuloFiltro(): string {
    return this.tipos.find((t) => t.valor === this.svc.filtro())?.rotulo ?? '';
  }

  nova(): void {
    this.router.navigateByUrl('/denuncia/nova');
  }

  aoEditar(d: Denuncia): void {
    this.router.navigate(['/denuncia', d.id]);
  }

  async aoApoiar(d: Denuncia): Promise<void> {
    try {
      await this.svc.alternarApoio(d);
    } catch {
      this.aviso('Não foi possível registrar seu apoio.');
    }
  }

  async aoExcluir(d: Denuncia): Promise<void> {
    const alerta = await this.alertCtrl.create({
      header: 'Excluir denúncia?',
      message: `"${d.titulo}" será removida do mural. Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Excluir', role: 'confirm' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    if (role !== 'confirm') return;

    try {
      await this.svc.excluir(d.id!);
      this.aviso('Denúncia excluída.');
    } catch {
      this.aviso('Você não tem permissão para excluir esta denúncia.');
    }
  }

  async sair(): Promise<void> {
    this.svc.parar();
    await this.auth.sair();
    this.nav.navigateRoot('/login');
  }

  private async aviso(mensagem: string): Promise<void> {
    const t = await this.toastCtrl.create({ message: mensagem, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
