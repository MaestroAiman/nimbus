import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  type FileEntry,
  type Folder,
  formatDate,
  formatSize,
  listFolder,
  updateFile,
  updateFolder,
  uploadFile,
} from '../lib/files-api';

interface Crumb {
  id: string | null;
  name: string;
}

interface RenamingEntry {
  type: 'folder' | 'file';
  id: string;
  value: string;
}

interface MovingEntry {
  type: 'folder' | 'file';
  id: string;
  name: string;
}

const ROOT_CRUMB: Crumb = { id: null, name: 'Racine' };

export function ExplorerPage() {
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([ROOT_CRUMB]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renaming, setRenaming] = useState<RenamingEntry | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [moving, setMoving] = useState<MovingEntry | null>(null);
  const [pickerBreadcrumb, setPickerBreadcrumb] = useState<Crumb[]>([ROOT_CRUMB]);
  const [pickerFolders, setPickerFolders] = useState<Folder[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id;
  const pickerFolderId = pickerBreadcrumb[pickerBreadcrumb.length - 1].id;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const contents = await listFolder(currentFolderId);
      setFolders(contents.folders);
      setFiles(contents.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le dossier');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!moving) return;

    let cancelled = false;
    setPickerLoading(true);
    setPickerError(null);

    listFolder(pickerFolderId)
      .then((contents) => {
        if (!cancelled) setPickerFolders(contents.folders);
      })
      .catch((err) => {
        if (!cancelled) setPickerError(err instanceof Error ? err.message : 'Impossible de charger le dossier');
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [moving, pickerFolderId]);

  function openFolder(folder: Folder) {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function goToCrumb(index: number) {
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  }

  async function handleCreateFolder(event: FormEvent) {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    try {
      await createFolder(name, currentFolderId);
      setIsCreatingFolder(false);
      setNewFolderName('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le dossier');
    }
  }

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setUploadProgress(0);
    try {
      await uploadFile(file, currentFolderId, setUploadProgress);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer le fichier");
    } finally {
      setUploadProgress(null);
    }
  }

  function startRename(entry: RenamingEntry) {
    setRenaming(entry);
  }

  async function handleRenameSubmit(event: FormEvent) {
    event.preventDefault();
    if (!renaming) return;
    const name = renaming.value.trim();
    if (!name) return;

    try {
      if (renaming.type === 'folder') {
        await updateFolder(renaming.id, { name });
      } else {
        await updateFile(renaming.id, { name });
      }
      setRenaming(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de renommer');
    }
  }

  function startMove(entry: MovingEntry) {
    setMoving(entry);
    setPickerBreadcrumb([ROOT_CRUMB]);
    setPickerError(null);
  }

  function openPickerFolder(folder: Folder) {
    setPickerBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function goToPickerCrumb(index: number) {
    setPickerBreadcrumb((prev) => prev.slice(0, index + 1));
  }

  async function handleMoveConfirm() {
    if (!moving) return;
    setPickerError(null);

    try {
      if (moving.type === 'folder') {
        await updateFolder(moving.id, { parentId: pickerFolderId });
      } else {
        await updateFile(moving.id, { folderId: pickerFolderId });
      }
      setMoving(null);
      await refresh();
    } catch (err) {
      setPickerError(err instanceof Error ? err.message : 'Impossible de déplacer');
    }
  }

  async function handleDeleteFolder(folder: Folder) {
    if (!window.confirm(`Supprimer le dossier "${folder.name}" et tout son contenu ?`)) return;
    try {
      await deleteFolder(folder.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer le dossier');
    }
  }

  async function handleDeleteFile(file: FileEntry) {
    if (!window.confirm(`Supprimer le fichier "${file.name}" ?`)) return;
    try {
      await deleteFile(file.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer le fichier');
    }
  }

  async function handleDownload(file: FileEntry) {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de télécharger le fichier');
    }
  }

  const isEmpty = !isLoading && folders.length === 0 && files.length === 0;

  return (
    <div>
      <div className="explorer__header">
        <div>
          <h1>Mes fichiers</h1>
          <div className="explorer__breadcrumb">
            {breadcrumb.map((crumb, index) => (
              <span key={crumb.id ?? 'root'}>
                {index > 0 && ' / '}
                <button type="button" className="explorer__breadcrumb-link" onClick={() => goToCrumb(index)}>
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="explorer__actions">
          <input ref={fileInputRef} type="file" hidden onChange={handleUploadChange} />
          <button
            type="button"
            className="button button--secondary"
            disabled={uploadProgress !== null}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadProgress !== null ? `Envoi… ${uploadProgress}%` : 'Envoyer un fichier'}
          </button>
          <button type="button" className="button" onClick={() => setIsCreatingFolder(true)}>
            Nouveau dossier
          </button>
        </div>
      </div>

      {uploadProgress !== null && (
        <div className="explorer__progress">
          <div className="explorer__progress-bar" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {isCreatingFolder && (
        <form className="explorer__inline-form" onSubmit={handleCreateFolder}>
          <input
            type="text"
            autoFocus
            placeholder="Nom du dossier"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
          />
          <button type="submit" className="button">
            Créer
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              setIsCreatingFolder(false);
              setNewFolderName('');
            }}
          >
            Annuler
          </button>
        </form>
      )}

      {error && <p className="explorer__error">{error}</p>}

      {isLoading ? (
        <p className="explorer__empty">Chargement…</p>
      ) : isEmpty ? (
        <p className="explorer__empty">Ce dossier est vide.</p>
      ) : (
        <table className="explorer-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Taille</th>
              <th>Modifié le</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {folders.map((folder) => (
              <tr key={folder.id}>
                <td>
                  {renaming?.type === 'folder' && renaming.id === folder.id ? (
                    <form className="explorer__inline-form" onSubmit={handleRenameSubmit}>
                      <input
                        type="text"
                        autoFocus
                        value={renaming.value}
                        onChange={(event) => setRenaming({ ...renaming, value: event.target.value })}
                      />
                      <button type="submit" className="button">
                        OK
                      </button>
                      <button type="button" className="button button--secondary" onClick={() => setRenaming(null)}>
                        Annuler
                      </button>
                    </form>
                  ) : (
                    <button type="button" className="explorer-row__name explorer-row__link" onClick={() => openFolder(folder)}>
                      <span className="explorer-row__icon">📁</span>
                      {folder.name}
                    </button>
                  )}
                </td>
                <td>—</td>
                <td>{formatDate(folder.updatedAt)}</td>
                <td className="explorer-row__actions">
                  <button
                    type="button"
                    className="explorer-row__action"
                    onClick={() => startMove({ type: 'folder', id: folder.id, name: folder.name })}
                  >
                    Déplacer
                  </button>
                  <button
                    type="button"
                    className="explorer-row__action"
                    onClick={() => startRename({ type: 'folder', id: folder.id, value: folder.name })}
                  >
                    Renommer
                  </button>
                  <button type="button" className="explorer-row__action explorer-row__action--danger" onClick={() => handleDeleteFolder(folder)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {files.map((file) => (
              <tr key={file.id}>
                <td>
                  {renaming?.type === 'file' && renaming.id === file.id ? (
                    <form className="explorer__inline-form" onSubmit={handleRenameSubmit}>
                      <input
                        type="text"
                        autoFocus
                        value={renaming.value}
                        onChange={(event) => setRenaming({ ...renaming, value: event.target.value })}
                      />
                      <button type="submit" className="button">
                        OK
                      </button>
                      <button type="button" className="button button--secondary" onClick={() => setRenaming(null)}>
                        Annuler
                      </button>
                    </form>
                  ) : (
                    <span className="explorer-row__name">
                      <span className="explorer-row__icon">📄</span>
                      {file.name}
                    </span>
                  )}
                </td>
                <td>{formatSize(file.sizeBytes)}</td>
                <td>{formatDate(file.updatedAt)}</td>
                <td className="explorer-row__actions">
                  <button type="button" className="explorer-row__action" onClick={() => handleDownload(file)}>
                    Télécharger
                  </button>
                  <button
                    type="button"
                    className="explorer-row__action"
                    onClick={() => startMove({ type: 'file', id: file.id, name: file.name })}
                  >
                    Déplacer
                  </button>
                  <button
                    type="button"
                    className="explorer-row__action"
                    onClick={() => startRename({ type: 'file', id: file.id, value: file.name })}
                  >
                    Renommer
                  </button>
                  <button type="button" className="explorer-row__action explorer-row__action--danger" onClick={() => handleDeleteFile(file)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {moving && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Déplacer « {moving.name} »</h2>
            <div className="explorer__breadcrumb">
              {pickerBreadcrumb.map((crumb, index) => (
                <span key={crumb.id ?? 'root'}>
                  {index > 0 && ' / '}
                  <button type="button" className="explorer__breadcrumb-link" onClick={() => goToPickerCrumb(index)}>
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>

            {pickerError && <p className="explorer__error">{pickerError}</p>}

            <ul className="modal__folder-list">
              {pickerLoading ? (
                <li className="modal__folder-empty">Chargement…</li>
              ) : pickerFolders.length === 0 ? (
                <li className="modal__folder-empty">Aucun sous-dossier</li>
              ) : (
                pickerFolders.map((folder) => (
                  <li key={folder.id}>
                    <button type="button" className="explorer-row__link" onClick={() => openPickerFolder(folder)}>
                      📁 {folder.name}
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="modal__actions">
              <button type="button" className="button button--secondary" onClick={() => setMoving(null)}>
                Annuler
              </button>
              <button type="button" className="button" onClick={handleMoveConfirm}>
                Déplacer ici
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
