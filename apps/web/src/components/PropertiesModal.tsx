import { useEffect, useState } from 'react';
import {
  type FileEntry,
  type Folder,
  fileTypeLabel,
  formatDateLong,
  formatExactSize,
  formatPath,
  getFileProperties,
  getFolderProperties,
} from '../lib/files-api';

export type PropertiesTarget = { kind: 'file'; file: FileEntry } | { kind: 'folder'; folder: Folder };

interface PropertiesModalProps {
  target: PropertiesTarget;
  onClose: () => void;
}

interface LoadedProperties {
  path: string[];
  sizeBytes: number;
  contents: string | null;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

export function PropertiesModal({ target, onClose }: PropertiesModalProps) {
  const [loaded, setLoaded] = useState<LoadedProperties | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const entry = target.kind === 'file' ? target.file : target.folder;

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setErrorMessage(null);

    const load: Promise<LoadedProperties> =
      target.kind === 'file'
        ? getFileProperties(target.file.id).then(({ path }) => ({
            path,
            sizeBytes: target.file.sizeBytes,
            contents: null,
          }))
        : getFolderProperties(target.folder.id).then(({ path, sizeBytes, fileCount, folderCount }) => ({
            path,
            sizeBytes,
            contents: `${pluralize(fileCount, 'fichier', 'fichiers')}, ${pluralize(folderCount, 'dossier', 'dossiers')}`,
          }));

    load
      .then((properties) => {
        if (!cancelled) setLoaded(properties);
      })
      .catch((err) => {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : 'Impossible de charger les propriétés');
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const pending = errorMessage ? '—' : '…';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--properties" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal__title">Propriétés</h2>

        <dl className="properties">
          <dt>Nom</dt>
          <dd>{entry.name}</dd>

          <dt>Type</dt>
          <dd>{target.kind === 'file' ? fileTypeLabel(target.file.mimeType, target.file.name) : 'Dossier'}</dd>

          <dt>Emplacement</dt>
          <dd>{loaded ? formatPath(loaded.path) : pending}</dd>

          <dt>Taille</dt>
          <dd>{loaded ? formatExactSize(loaded.sizeBytes) : pending}</dd>

          {target.kind === 'folder' && (
            <>
              <dt>Contenu</dt>
              <dd>{loaded?.contents ?? pending}</dd>
            </>
          )}

          <dt>Créé le</dt>
          <dd>{formatDateLong(entry.createdAt)}</dd>

          <dt>Modifié le</dt>
          <dd>{formatDateLong(entry.updatedAt)}</dd>
        </dl>

        {errorMessage && <p className="explorer__error">{errorMessage}</p>}

        <div className="modal__actions">
          <button type="button" className="button button--secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
