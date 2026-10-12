import { useEffect, useState } from 'react';
import { classifyFile } from '../lib/file-kind';
import { API_BASE, downloadFile, fetchFileBlob, formatSize, type FileEntry } from '../lib/files-api';
import { FormatBadge } from './FormatBadge';
import { IconChevronLeft, IconChevronRight, IconClose, IconDownload } from './icons';

interface FilePreviewModalProps {
  file: FileEntry;
  /** Fichiers parcourables avec les fleches, dans l'ordre affiche (le fichier ouvert en fait partie). */
  siblings?: FileEntry[];
  onNavigate?: (file: FileEntry) => void;
  onClose: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export function FilePreviewModal({ file, siblings, onNavigate, onClose }: FilePreviewModalProps) {
  const { kind, badgeLabel, badgeVariant } = classifyFile(file.mimeType, file.name);
  const isImage = kind === 'image';
  const isPdf = kind === 'pdf';
  const isRawPreview = kind === 'raw-preview';

  const [status, setStatus] = useState<Status>('loading');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Vignette generee cote serveur (RAW/HEIC) : bascule sur le repli generique si elle
  // echoue a charger (pas d'apercu integre, fichier corrompu...).
  const [rawPreviewFailed, setRawPreviewFailed] = useState(false);

  const index = siblings ? siblings.findIndex((sibling) => sibling.id === file.id) : -1;
  const previous = onNavigate && siblings && index > 0 ? siblings[index - 1] : null;
  const next = onNavigate && siblings && index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  useEffect(() => {
    setRawPreviewFailed(false);

    // Seuls les images et PDF sont recuperes en entier pour l'aperçu : les autres types
    // n'ont rien a charger (badge statique, ou vignette RAW/HEIC chargee directement
    // via son URL, geree par son propre <img>).
    if (!isImage && !isPdf) {
      setStatus('ready');
      return;
    }

    let cancelled = false;
    let url: string | null = null;
    setStatus('loading');
    setObjectUrl(null);
    setErrorMessage(null);

    fetchFileBlob(file.id)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Impossible de charger l'aperçu");
        setStatus('error');
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, isImage, isPdf]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      const target = event.target;
      const isTyping = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (isTyping || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const destination = event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : null;
      if (destination && onNavigate) {
        event.preventDefault();
        onNavigate(destination);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, previous, next]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--preview modal--fullscreen" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{file.name}</h2>
          {siblings && index >= 0 && siblings.length > 1 && (
            <span className="preview-modal__counter">
              {index + 1} / {siblings.length}
            </span>
          )}
          <button
            type="button"
            className="modal__download"
            onClick={() => downloadFile(file.id, file.name)}
            aria-label="Télécharger"
          >
            <IconDownload />
          </button>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer l'aperçu">
            <IconClose />
          </button>
        </div>

        <div className="preview-modal__body">
          {previous && onNavigate && (
            <button
              type="button"
              className="preview-modal__nav preview-modal__nav--previous"
              onClick={() => onNavigate(previous)}
              aria-label="Fichier précédent"
            >
              <IconChevronLeft />
            </button>
          )}
          {next && onNavigate && (
            <button
              type="button"
              className="preview-modal__nav preview-modal__nav--next"
              onClick={() => onNavigate(next)}
              aria-label="Fichier suivant"
            >
              <IconChevronRight />
            </button>
          )}

          {status === 'loading' && <p className="preview-modal__message">Chargement de l'aperçu…</p>}
          {status === 'error' && <p className="preview-modal__message">{errorMessage}</p>}
          {status === 'ready' && objectUrl && isImage && (
            <img key={file.id} src={objectUrl} alt={file.name} className="preview-modal__image" />
          )}
          {status === 'ready' && objectUrl && isPdf && (
            <iframe key={file.id} src={objectUrl} title={file.name} className="preview-modal__frame" />
          )}
          {status === 'ready' && isRawPreview && !rawPreviewFailed && (
            <div className="preview-modal__raw">
              <img
                key={file.id}
                src={`${API_BASE}/files/${file.id}/thumbnail`}
                alt={file.name}
                className="preview-modal__image"
                onError={() => setRawPreviewFailed(true)}
              />
              <p className="preview-modal__raw-note">
                Aperçu basse résolution généré depuis la vignette intégrée au fichier.
              </p>
            </div>
          )}
          {status === 'ready' && !isImage && !isPdf && (!isRawPreview || rawPreviewFailed) && (
            <div className="preview-modal__fallback">
              <FormatBadge kind={kind} badgeLabel={badgeLabel} badgeVariant={badgeVariant} size="fallback" />
              <p className="preview-modal__message">
                Aperçu non disponible pour les fichiers {badgeLabel} ({formatSize(file.sizeBytes)}).
              </p>
              <button type="button" className="button" onClick={() => downloadFile(file.id, file.name)}>
                <IconDownload />
                Télécharger
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
