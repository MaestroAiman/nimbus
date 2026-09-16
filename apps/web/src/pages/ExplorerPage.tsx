import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ActionsMenu, type MenuAction } from '../components/ActionsMenu';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { IconFile, IconFolder, IconGridView, IconListView, IconNewFolder, IconUpload } from '../components/icons';
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

type ViewMode = 'list' | 'grid';

const ROOT_CRUMB: Crumb = { id: null, name: 'Racine' };

export function ExplorerPage() {
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([ROOT_CRUMB]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renaming, setRenaming] = useState<RenamingEntry | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [previewingFile, setPreviewingFile] = useState<FileEntry | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    try {
      await deleteFolder(folder.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer le dossier');
    }
  }

  async function handleDeleteFile(file: FileEntry) {
    try {
      await deleteFile(file.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer le fichier');
    }
  }

  async function handleToggleFolderFavorite(folder: Folder) {
    try {
      await updateFolder(folder.id, { isFavorite: !folder.isFavorite });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour les favoris');
    }
  }

  async function handleToggleFileFavorite(file: FileEntry) {
    try {
      await updateFile(file.id, { isFavorite: !file.isFavorite });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour les favoris');
    }
  }

  async function handleDownload(file: FileEntry) {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de télécharger le fichier');
    }
  }

  function folderActions(folder: Folder): MenuAction[] {
    return [
      {
        label: folder.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris',
        onClick: () => handleToggleFolderFavorite(folder),
      },
      { label: 'Déplacer', onClick: () => startMove({ type: 'folder', id: folder.id, name: folder.name }) },
      { label: 'Renommer', onClick: () => startRename({ type: 'folder', id: folder.id, value: folder.name }) },
      { label: 'Supprimer', onClick: () => handleDeleteFolder(folder), danger: true },
    ];
  }

  function fileActions(file: FileEntry): MenuAction[] {
    return [
      { label: 'Télécharger', onClick: () => handleDownload(file) },
      {
        label: file.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris',
        onClick: () => handleToggleFileFavorite(file),
      },
      { label: 'Déplacer', onClick: () => startMove({ type: 'file', id: file.id, name: file.name }) },
      { label: 'Renommer', onClick: () => startRename({ type: 'file', id: file.id, value: file.name }) },
      { label: 'Supprimer', onClick: () => handleDeleteFile(file), danger: true },
    ];
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
          <div className="segmented-control">
            <button
              type="button"
              className={`segmented-control__button${viewMode === 'list' ? ' segmented-control__button--active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="Vue liste"
            >
              <IconListView />
            </button>
            <button
              type="button"
              className={`segmented-control__button${viewMode === 'grid' ? ' segmented-control__button--active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Vue grille"
            >
              <IconGridView />
            </button>
          </div>
          <input ref={fileInputRef} type="file" hidden onChange={handleUploadChange} />
          <button
            type="button"
            className="button button--secondary"
            disabled={uploadProgress !== null}
            onClick={() => fileInputRef.current?.click()}
          >
            <IconUpload />
            {uploadProgress !== null ? `Envoi… ${uploadProgress}%` : 'Envoyer un fichier'}
          </button>
          <button type="button" className="button" onClick={() => setIsCreatingFolder(true)}>
            <IconNewFolder />
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
        <div className="explorer__empty">
          <p className="explorer__empty-title">Chargement…</p>
        </div>
      ) : isEmpty ? (
        <div className="explorer__empty">
          <IconFolder width={40} height={40} strokeWidth={1.3} />
          <p className="explorer__empty-title">Ce dossier est vide.</p>
          <p className="explorer__empty-subtitle">Envoyez un fichier ou créez un dossier pour commencer.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="explorer-table-wrapper">
          <table className="explorer-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Taille</th>
                <th>Modifié le</th>
                <th></th>
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
                      <button
                        type="button"
                        className="explorer-row__name explorer-row__link"
                        onClick={() => openFolder(folder)}
                      >
                        <IconFolder className="explorer-row__icon" />
                        {folder.name}
                      </button>
                    )}
                  </td>
                  <td>—</td>
                  <td>{formatDate(folder.updatedAt)}</td>
                  <td className="explorer-row__actions">
                    <ActionsMenu
                      actions={folderActions(folder)}
                      isOpen={openMenuId === folder.id}
                      onToggle={() => setOpenMenuId((current) => (current === folder.id ? null : folder.id))}
                      onClose={() => setOpenMenuId(null)}
                      label={`Actions pour ${folder.name}`}
                    />
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
                      <button
                        type="button"
                        className="explorer-row__name explorer-row__link"
                        onClick={() => setPreviewingFile(file)}
                      >
                        <IconFile className="explorer-row__icon" />
                        {file.name}
                      </button>
                    )}
                  </td>
                  <td>{formatSize(file.sizeBytes)}</td>
                  <td>{formatDate(file.updatedAt)}</td>
                  <td className="explorer-row__actions">
                    <ActionsMenu
                      actions={fileActions(file)}
                      isOpen={openMenuId === file.id}
                      onToggle={() => setOpenMenuId((current) => (current === file.id ? null : file.id))}
                      onClose={() => setOpenMenuId(null)}
                      label={`Actions pour ${file.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="explorer-grid">
          {folders.map((folder) =>
            renaming?.type === 'folder' && renaming.id === folder.id ? (
              <div key={folder.id} className="explorer-grid__item">
                <IconFolder width={28} height={28} strokeWidth={1.3} />
                <form className="explorer__inline-form explorer__inline-form--grid" onSubmit={handleRenameSubmit}>
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
              </div>
            ) : (
              <div
                key={folder.id}
                className="explorer-grid__item"
                role="button"
                tabIndex={0}
                onClick={() => openFolder(folder)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openFolder(folder);
                  }
                }}
              >
                <div className="explorer-grid__menu" onClick={(event) => event.stopPropagation()}>
                  <ActionsMenu
                    actions={folderActions(folder)}
                    isOpen={openMenuId === folder.id}
                    onToggle={() => setOpenMenuId((current) => (current === folder.id ? null : folder.id))}
                    onClose={() => setOpenMenuId(null)}
                    label={`Actions pour ${folder.name}`}
                  />
                </div>
                <IconFolder width={28} height={28} strokeWidth={1.3} />
                <span className="explorer-grid__name">{folder.name}</span>
                <span className="explorer-grid__meta">{formatDate(folder.updatedAt)}</span>
              </div>
            ),
          )}
          {files.map((file) =>
            renaming?.type === 'file' && renaming.id === file.id ? (
              <div key={file.id} className="explorer-grid__item">
                <IconFile width={28} height={28} strokeWidth={1.3} />
                <form className="explorer__inline-form explorer__inline-form--grid" onSubmit={handleRenameSubmit}>
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
              </div>
            ) : (
              <div
                key={file.id}
                className="explorer-grid__item"
                role="button"
                tabIndex={0}
                onClick={() => setPreviewingFile(file)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setPreviewingFile(file);
                  }
                }}
              >
                <div className="explorer-grid__menu" onClick={(event) => event.stopPropagation()}>
                  <ActionsMenu
                    actions={fileActions(file)}
                    isOpen={openMenuId === file.id}
                    onToggle={() => setOpenMenuId((current) => (current === file.id ? null : file.id))}
                    onClose={() => setOpenMenuId(null)}
                    label={`Actions pour ${file.name}`}
                  />
                </div>
                <IconFile width={28} height={28} strokeWidth={1.3} />
                <span className="explorer-grid__name">{file.name}</span>
                <span className="explorer-grid__meta">{formatSize(file.sizeBytes)}</span>
              </div>
            ),
          )}
        </div>
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
                      <IconFolder />
                      {folder.name}
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

      {previewingFile && <FilePreviewModal file={previewingFile} onClose={() => setPreviewingFile(null)} />}
    </div>
  );
}
