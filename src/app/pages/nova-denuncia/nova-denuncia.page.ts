import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController, IonButton, IonButtons, IonContent, IonHeader, IonInput,
  IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToolbar,
  NavController, ToastController,
} from '@ionic/angular';
import { MapPickerComponent, PontoMapa } from '../../components/map-picker/map-picker.component';
import { DenunciaForm, STATUS, StatusDenuncia, TIPOS, TipoDenuncia } from '../../models/denuncia.model';
import { AuthService } from '../../services/auth.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { DenunciaService } from '../../services/denuncia.service';

const MAX_FOTO_MB = 15;

@Component({
  selector: 'app-nova-denuncia',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    MapPickerComponent
],
  templateUrl: './nova-denuncia.page.html',
  styleUrls: ['./nova-denuncia.page.scss'],
})
export class NovaDenunciaPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private svc = inject(DenunciaService);
  private cloud = inject(CloudinaryService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private nav = inject(NavController);
  auth = inject(AuthService);

  readonly tipos = TIPOS;
  readonly statusOpcoes = STATUS;

  // ---- estado do formulário ----
  id: string | null = null;
  titulo = signal('');
  tipo = signal<TipoDenuncia | null>(null);
  descricao = signal('');
  localTexto = signal('');
  lat = signal<number | null>(null);
  lng = signal<number | null>(null);
  status = signal<StatusDenuncia>('aberta');

  fotoSalva = signal<string | null>(null);   // url já no Cloudinary (edição)
  fotoArquivo = signal<File | null>(null);   // arquivo novo escolhido
  fotoPreview = signal<string | null>(null); // blob: url para mostrar

  carregando = signal(false);
  enviando = signal(false);
  obtendoGps = signal(false);
  buscandoEndereco = signal(false);
  erroEnvio = signal('');
  private localAuto = false; // texto do local veio do mapa/GPS (pode ser atualizado)

  // ---- REGRA DO PRINT, vinda do service ----
  readonly form = computed<DenunciaForm>(() => ({
    titulo: this.titulo(),
    tipo: this.tipo(),
    descricao: this.descricao(),
    temFoto: !!(this.fotoArquivo() || this.fotoSalva()),
    localTexto: this.localTexto(),
    lat: this.lat(),
    lng: this.lng(),
  }));
  readonly validacao = computed(() => this.svc.validarEnvio(this.form()));

  readonly temFoto = computed(() => this.form().temFoto);
  readonly temLocal = computed(() => !this.validacao().faltando.includes('local'));
  readonly fotoExibida = computed(() => this.fotoPreview() ?? this.cloud.miniatura(this.fotoSalva(), 900));
  readonly rotuloTipo = computed(() => TIPOS.find((t) => t.valor === this.tipo())?.rotulo ?? '');

  async ngOnInit(): Promise<void> {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) return;

    this.carregando.set(true);
    try {
      const d = await this.svc.obter(this.id);
      if (!d) return this.sairComAviso('Denúncia não encontrada.');
      if (!this.svc.podeEditar(d)) return this.sairComAviso('Só o autor ou um admin pode editar.');

      this.titulo.set(d.titulo);
      this.tipo.set(d.tipo);
      this.descricao.set(d.descricao ?? '');
      this.localTexto.set(d.localTexto ?? '');
      this.lat.set(d.lat);
      this.lng.set(d.lng);
      this.status.set(d.status);
      this.fotoSalva.set(d.fotoUrl);
    } catch {
      this.sairComAviso('Não foi possível abrir a denúncia.');
    } finally {
      this.carregando.set(false);
    }
  }

  ngOnDestroy(): void {
    this.liberarPreview();
  }

  // ---------- foto ----------
  aoEscolherFoto(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      this.erroEnvio.set('Escolha um arquivo de imagem.');
      return;
    }
    if (arquivo.size > MAX_FOTO_MB * 1024 * 1024) {
      this.erroEnvio.set(`A foto passa de ${MAX_FOTO_MB} MB. Escolha uma menor.`);
      return;
    }
    this.erroEnvio.set('');
    this.liberarPreview();
    this.fotoArquivo.set(arquivo);
    this.fotoPreview.set(URL.createObjectURL(arquivo));
  }

  removerFoto(): void {
    this.liberarPreview();
    this.fotoArquivo.set(null);
    this.fotoSalva.set(null);
  }

  private liberarPreview(): void {
    const p = this.fotoPreview();
    if (p) URL.revokeObjectURL(p);
    this.fotoPreview.set(null);
  }

  // ---------- local (texto + mapa + GPS) ----------
  usarMinhaLocalizacao(): void {
    if (!navigator.geolocation) {
      this.aviso('Seu navegador não oferece localização. Marque no mapa.');
      return;
    }
    this.obtendoGps.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.obtendoGps.set(false);
        this.aoEscolherPonto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        this.obtendoGps.set(false);
        this.aviso('Não consegui obter sua localização. Marque no mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async aoEscolherPonto(p: PontoMapa): Promise<void> {
    this.lat.set(p.lat);
    this.lng.set(p.lng);
    // só preenche o texto se estiver vazio ou se ele mesmo veio do mapa
    if (this.localTexto().trim() && !this.localAuto) return;

    this.buscandoEndereco.set(true);
    const endereco = await this.enderecoDe(p);
    this.buscandoEndereco.set(false);
    this.localTexto.set(endereco);
    this.localAuto = true;
  }

  aoDigitarLocal(): void {
    this.localAuto = false;
  }

  limparPonto(): void {
    this.lat.set(null);
    this.lng.set(null);
  }

  /** Nominatim (OpenStreetMap). Se falhar, usa as coordenadas como texto. */
  private async enderecoDe(p: PontoMapa): Promise<string> {
    const coords = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=pt-BR` +
        `&lat=${p.lat}&lon=${p.lng}`;
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!resp.ok) return coords;
      const a = (await resp.json())?.address ?? {};
      const partes = [
        a.road, a.suburb || a.neighbourhood,
        a.city || a.town || a.village || a.municipality,
      ].filter(Boolean);
      return partes.length ? partes.join(', ') : coords;
    } catch {
      return coords;
    }
  }

  // ---------- envio ----------
  async enviar(): Promise<void> {
    if (!this.validacao().ok || this.enviando()) return;
    this.erroEnvio.set('');

    const editando = !!this.id;
    const alerta = await this.alertCtrl.create({
      header: editando ? 'Salvar alterações?' : 'Enviar denúncia?',
      message: 'Ela ficará visível no mural para todos os usuários.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: editando ? 'Salvar' : 'Enviar', role: 'confirm' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    if (role !== 'confirm') return;

    this.enviando.set(true);
    try {
      let fotoUrl = this.fotoSalva();
      const arquivo = this.fotoArquivo();
      if (arquivo) fotoUrl = await this.cloud.enviar(arquivo);
      if (!fotoUrl) throw new Error('Envio bloqueado: inclua foto');

      if (this.id) {
        await this.svc.atualizar(this.id, this.form(), fotoUrl, this.status());
      } else {
        await this.svc.criar(this.form(), fotoUrl);
      }
      await this.aviso(editando ? 'Alterações salvas.' : 'Denúncia enviada. Obrigado por ajudar!');
      this.nav.navigateBack('/lista');
    } catch (e: any) {
      this.erroEnvio.set(e?.message || 'Não foi possível enviar. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
  }

  voltar(): void {
    this.nav.navigateBack('/lista');
  }

  private async sairComAviso(msg: string): Promise<void> {
    await this.aviso(msg);
    this.nav.navigateBack('/lista');
  }

  private async aviso(mensagem: string): Promise<void> {
    const t = await this.toastCtrl.create({ message: mensagem, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
