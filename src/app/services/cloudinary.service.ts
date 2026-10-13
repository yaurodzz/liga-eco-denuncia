import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  /** Reduz a imagem (lado maior 1600px, JPEG 80%) e envia ao Cloudinary. Retorna a secure_url. */
  async enviar(arquivo: File): Promise<string> {
    const { cloudName, uploadPreset, folder } = environment.cloudinary;
    const reduzido = await this.reduzir(arquivo);

    const fd = new FormData();
    fd.append('file', reduzido);
    fd.append('upload_preset', uploadPreset);
    if (folder) fd.append('folder', folder);

    const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: fd,
    });
    if (!resp.ok) {
      throw new Error('Falha ao enviar a foto. Confira cloudName e upload preset (unsigned).');
    }
    const dados = await resp.json();
    return dados.secure_url as string;
  }

  /** Insere transformações na URL (largura limitada, qualidade e formato automáticos). */
  miniatura(url: string | null, largura = 600): string {
    if (!url || !url.includes('/upload/')) return url ?? '';
    return url.replace('/upload/', `/upload/w_${largura},c_limit,q_auto,f_auto/`);
  }

  private reduzir(arquivo: File, max = 1600): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => resolve(b ?? arquivo), 'image/jpeg', 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(arquivo); };
      img.src = url;
    });
  }
}
