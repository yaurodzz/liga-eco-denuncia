import { DatePipe, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, locationOutline, trashOutline } from 'ionicons/icons';
import { Denuncia, STATUS, TIPOS } from '../../models/denuncia.model';
import { CloudinaryService } from '../../services/cloudinary.service';

@Component({
  selector: 'app-denuncia-card',
  standalone: true,
  imports: [NgClass, DatePipe, IonIcon],
  templateUrl: './denuncia-card.component.html',
  styleUrls: ['./denuncia-card.component.scss'],
})
export class DenunciaCardComponent {
  private cloud = inject(CloudinaryService);

  /** item do mural */
  @Input({ required: true }) denuncia!: Denuncia;
  /** true se o usuário é o autor ou admin */
  @Input() podeEditar = false;
  /** true se o usuário logado já apoiou */
  @Input() apoiou = false;

  /** ações: o PAI decide o que fazer (Firestore, rotas, confirmação) */
  @Output() apoiar = new EventEmitter<Denuncia>();
  @Output() editar = new EventEmitter<Denuncia>();
  @Output() excluir = new EventEmitter<Denuncia>();

  constructor() {
    addIcons({ createOutline, trashOutline, locationOutline });
  }

  get rotuloTipo(): string {
    return TIPOS.find((t) => t.valor === this.denuncia.tipo)?.rotulo ?? this.denuncia.tipo;
  }

  get rotuloStatus(): string {
    return STATUS.find((s) => s.valor === this.denuncia.status)?.rotulo ?? '';
  }

  get classeStatus(): string {
    return { resolvida: 'ok', em_analise: 'warn', aberta: 'off' }[this.denuncia.status] ?? 'off';
  }

  get miniatura(): string {
    return this.cloud.miniatura(this.denuncia.fotoUrl, 240);
  }

  get totalApoios(): number {
    return this.denuncia.apoiadores?.length ?? 0;
  }

  get data(): Date | null {
    return this.denuncia.criadoEm?.toDate?.() ?? null;
  }
}
