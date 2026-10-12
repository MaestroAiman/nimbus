// Classification des fichiers pour l'affichage (vignette reelle vs badge de type).
// Base sur l'extension en priorite : le mimeType envoye par le navigateur n'est pas
// fiable pour les formats exotiques (psd/ai/arw/heic finissent souvent en
// application/octet-stream).

export type FileKind = 'image' | 'raw-preview' | 'pdf' | 'psd' | 'ai' | 'other';

export interface FileKindInfo {
  kind: FileKind;
  /** Texte court affiché dans le badge quand aucune vignette n'est rendue. */
  badgeLabel: string;
  /** Suffixe de classe CSS pour la couleur du badge : .file-badge--{badgeVariant} */
  badgeVariant: string;
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico']);
// RAW et HEIC embarquent presque toujours un aperçu JPEG (EXIF/IFD1) qu'on peut extraire
// et servir comme vraie vignette, via GET /files/:id/thumbnail (voir apps/api).
const RAW_PREVIEW_EXTENSIONS = new Set(['arw', 'heic', 'heif']);

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : '';
}

export function classifyFile(mimeType: string, name: string): FileKindInfo {
  const extension = fileExtension(name);

  if (extension === 'psd') return { kind: 'psd', badgeLabel: 'PSD', badgeVariant: 'psd' };
  if (extension === 'ai') return { kind: 'ai', badgeLabel: 'AI', badgeVariant: 'ai' };

  if (RAW_PREVIEW_EXTENSIONS.has(extension)) {
    return { kind: 'raw-preview', badgeLabel: extension === 'arw' ? 'RAW' : 'HEIC', badgeVariant: 'raw' };
  }

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return { kind: 'pdf', badgeLabel: 'PDF', badgeVariant: 'pdf' };
  }

  if (mimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    return { kind: 'image', badgeLabel: 'Image', badgeVariant: 'image' };
  }

  return {
    kind: 'other',
    badgeLabel: extension ? extension.toUpperCase().slice(0, 4) : 'FILE',
    badgeVariant: 'other',
  };
}
