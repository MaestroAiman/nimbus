import { useEffect, useState } from 'react';
import { downloadFile, fetchFileBlob, formatSize, type FileEntry } from '../lib/files-api';
import { IconClose, IconDownload } from './icons';

interface FilePreviewModalProps {
  file: FileEntry;
  onClose: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setStatus('loading');
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
  }, [file.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--preview modal--fullscreen" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{file.name}</h2>
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
          {status === 'loading' && <p className="preview-modal__message">Chargement de l'aperçu…</p>}
          {status === 'error' && <p className="preview-modal__message">{errorMessage}</p>}
          {status === 'ready' && objectUrl && isImage && (
            <img src={objectUrl} alt={file.name} className="preview-modal__image" />
          )}
          {status === 'ready' && objectUrl && isPdf && (
            <iframe src={objectUrl} title={file.name} className="preview-modal__frame" />
          )}
          {status === 'ready' && !isImage && !isPdf && (
            <div className="preview-modal__fallback">
              <p className="preview-modal__message">
                Aperçu non disponible pour ce type de fichier ({formatSize(file.sizeBytes)}).
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
