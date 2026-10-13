import { Timestamp } from 'firebase/firestore';

export type TipoDenuncia = 'agua' | 'ar' | 'solo' | 'outros';
export type StatusDenuncia = 'aberta' | 'em_analise' | 'resolvida';

export const TIPOS: { valor: TipoDenuncia; rotulo: string }[] = [
  { valor: 'agua', rotulo: 'Água' },
  { valor: 'ar', rotulo: 'Ar' },
  { valor: 'solo', rotulo: 'Solo' },
  { valor: 'outros', rotulo: 'Outros' },
];

export const STATUS: { valor: StatusDenuncia; rotulo: string }[] = [
  { valor: 'aberta', rotulo: 'Aberta' },
  { valor: 'em_analise', rotulo: 'Em análise' },
  { valor: 'resolvida', rotulo: 'Resolvida' },
];

/** Documento da coleção `denuncias` */
export interface Denuncia {
  id?: string;
  titulo: string;
  tipo: TipoDenuncia;
  descricao: string;
  fotoUrl: string | null;
  localTexto: string;
  lat: number | null;
  lng: number | null;
  status: StatusDenuncia;
  autorId: string;
  autorNome: string;
  apoiadores: string[]; // uids de quem clicou no "+"
  criadoEm: Timestamp | null;
  atualizadoEm: Timestamp | null;
}

/** Dados que o formulário entrega ao service */
export interface DenunciaForm {
  titulo: string;
  tipo: TipoDenuncia | null;
  descricao: string;
  temFoto: boolean; // já existe foto salva OU há arquivo novo selecionado
  localTexto: string;
  lat: number | null;
  lng: number | null;
}

export interface ResultadoValidacao {
  ok: boolean;
  faltando: string[]; // ex.: ['foto', 'local']
  mensagem: string;   // ex.: "Envio bloqueado: inclua foto e local"
}
