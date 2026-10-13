import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges,
  OnDestroy, Output, SimpleChanges, ViewChild, ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';

export interface PontoMapa { lat: number; lng: number; }

/** Mapa OpenStreetMap (Leaflet, sem chave de API). Toque/clique ou arraste o pino para marcar o local. */
@Component({
  selector: 'app-map-picker',
  standalone: true,
  encapsulation: ViewEncapsulation.None, // estilos do pino precisam alcançar elementos criados pelo Leaflet
  template: `<div #mapa class="eco-mapa" role="application" aria-label="Mapa para marcar o local da denúncia"></div>`,
  styles: [`
    .eco-mapa { height: 260px; width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid var(--eco-slate-200); z-index: 0; }
    .eco-pin { background: none; border: 0; }
    .eco-pin span {
      display: block; width: 26px; height: 26px; background: #15803d;
      border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      border: 3px solid #fff; box-shadow: 0 2px 6px rgba(15, 23, 42, .4); position: relative;
    }
    .eco-pin span::after { content: ''; position: absolute; width: 8px; height: 8px; background: #fff; border-radius: 50%; top: 5px; left: 5px; }
  `],
})
export class MapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Output() escolhido = new EventEmitter<PontoMapa>();

  @ViewChild('mapa', { static: true }) private el!: ElementRef<HTMLDivElement>;
  private map?: L.Map;
  private marcador?: L.Marker;

  ngAfterViewInit(): void {
    // visão inicial: Brasil inteiro; ao marcar ou usar o GPS o mapa aproxima
    this.map = L.map(this.el.nativeElement).setView([-14.2, -51.9], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => this.marcar(e.latlng.lat, e.latlng.lng, true));

    if (this.lat !== null && this.lng !== null) this.marcar(this.lat, this.lng, false, 16);
    // dentro de páginas Ionic o tamanho só é conhecido depois da transição
    setTimeout(() => this.map?.invalidateSize(), 350);
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (!this.map || !(ch['lat'] || ch['lng'])) return;
    if (this.lat === null || this.lng === null) return;
    const atual = this.marcador?.getLatLng();
    if (atual && atual.lat === this.lat && atual.lng === this.lng) return; // veio do próprio clique
    this.marcar(this.lat, this.lng, false, Math.max(this.map.getZoom(), 16));
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private marcar(lat: number, lng: number, emitir: boolean, zoom?: number): void {
    if (!this.map) return;
    if (!this.marcador) {
      this.marcador = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({ className: 'eco-pin', html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 26] }),
      }).addTo(this.map);
      this.marcador.on('dragend', () => {
        const p = this.marcador!.getLatLng();
        this.escolhido.emit({ lat: p.lat, lng: p.lng });
      });
    } else {
      this.marcador.setLatLng([lat, lng]);
    }
    if (zoom) this.map.setView([lat, lng], zoom);
    if (emitir) this.escolhido.emit({ lat, lng });
  }
}
