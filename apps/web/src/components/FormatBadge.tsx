import type { FileKind } from '../lib/file-kind';
import { IconFileAi, IconFilePdf, IconFilePsd } from './icons';

interface FormatBadgeProps {
  kind: FileKind;
  badgeLabel: string;
  badgeVariant: string;
  size: 'row' | 'grid' | 'fallback';
}

const FORMAT_ICONS: Partial<Record<FileKind, typeof IconFilePsd>> = {
  psd: IconFilePsd,
  ai: IconFileAi,
  pdf: IconFilePdf,
};

// Rendu partage par FileThumbnail (grille/liste) et FilePreviewModal (repli plein
// ecran) pour les types sans vignette de contenu : vraie icone de format pour
// PSD/AI/PDF (voir icons.tsx), badge texte colore generique pour le reste (RAW/HEIC
// sans apercu integre, formats non reconnus).
export function FormatBadge({ kind, badgeLabel, badgeVariant, size }: FormatBadgeProps) {
  const FormatIcon = FORMAT_ICONS[kind];

  if (FormatIcon) {
    return (
      <span className={`file-format-icon file-format-icon--${size}`} aria-hidden="true">
        <FormatIcon />
      </span>
    );
  }

  return (
    <span className={`file-badge file-badge--${size} file-badge--${badgeVariant}`} aria-hidden="true">
      {badgeLabel}
    </span>
  );
}
