import { useState } from 'react';
import { classifyFile } from '../lib/file-kind';
import { API_BASE, type FileEntry } from '../lib/files-api';
import { FormatBadge } from './FormatBadge';

interface FileThumbnailProps {
  file: FileEntry;
  variant: 'row' | 'grid';
}

// Vignette (image reelle) pour les images et, quand une preview integree a pu etre
// extraite cote serveur, pour les RAW/HEIC ; sinon une icone/un badge de type (voir
// FormatBadge), a la facon de Google Drive. `onError` fait basculer sur le repli si le
// navigateur ne sait pas decoder l'image (ex. TIFF) ou si aucune vignette n'a pu etre
// generee (ex. RAW sans apercu integre).
export function FileThumbnail({ file, variant }: FileThumbnailProps) {
  const { kind, badgeLabel, badgeVariant } = classifyFile(file.mimeType, file.name);
  const [imageFailed, setImageFailed] = useState(false);

  const imageSrc =
    kind === 'image'
      ? `${API_BASE}/files/${file.id}/download`
      : kind === 'raw-preview'
        ? `${API_BASE}/files/${file.id}/thumbnail`
        : null;

  if (imageSrc && !imageFailed) {
    return (
      <img
        src={imageSrc}
        alt=""
        loading="lazy"
        className={`file-thumb file-thumb--${variant}`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <FormatBadge kind={kind} badgeLabel={badgeLabel} badgeVariant={badgeVariant} size={variant} />;
}
