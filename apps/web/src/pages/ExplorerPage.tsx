import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ActionsMenu, type MenuAction } from '../components/ActionsMenu';
import { FilePreviewModal } from '../components/FilePreviewModal';
import {
  IconClose,
  IconFile,
  IconFolder,
  IconGridView,
  IconListView,
  IconNewFolder,
  IconUpload,
} from '../components/icons';
import { NameSheet } from '../components/NameSheet';
import { RowName } from '../components/RowName';
import { UploadSourceSheet } from '../components/UploadSourceSheet';
import { useIsMobile } from '../lib/use-media-query';
import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  downloadFolder,
  type FileEntry,
  type Folder,
  formatDate,
  formatSize,
  listFolder,
  updateFile,
  updateFolder,
} from '../lib/files-api';
import {
  contentFromDrop,
  contentFromFiles,
  type UploadContent,
  type UploadProgress,
  uploadContent,
} from '../lib/folder-upload';

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
  const isMobile = useIsMobile();
  const [isChoosingUpload, setIsChoosingUpload] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([ROOT_CRUMB]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renaming, setRenaming] = useState<RenamingEntry | null>(null);
  const [upload, setUpload] = useState<UploadProgress | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [previewingFile, setPreviewingFile] = useState<FileEntry | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [moving, setMoving] = useState<MovingEntry | null>(null);
  const [pickerBreadcrumb, setPickerBreadcrumb] = useState<Crumb[]>([ROOT_CRUMB]);
  const [pickerFolders, setPickerFolders] = useState<Folder[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  // Un envoi peut durer longtemps : a sa fin on rafraichit le dossier affiche a cet instant,
  // pas celui ou l'envoi a demarre (l'utilisateur a pu naviguer entre-temps).
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
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

  function handleCreateFolder(event: FormEvent) {
    event.preventDefault();
    return submitNewFolder(newFolderName);
  }

  async function submitNewFolder(rawName: string) {
    const name = rawName.trim();
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

  async function startUpload(content: UploadContent) {
    setError(null);
    setUpload({ percent: 0, sentFiles: 0, totalFiles: 0 });
    let failure: string | null = null;

    try {
      const summary = await uploadContent(content, currentFolderId, setUpload);
      // `error` peut exister sans fichier en echec : dossier vide dont la creation a echoue.
      if (summary.error) {
        failure =
          summary.failedFiles === 0 || summary.totalFiles === 1
            ? summary.error
            : `${summary.failedFiles} fichier(s) sur ${summary.totalFiles} n'ont pas pu être envoyés : ${summary.error}`;
      }
    } catch (err) {
      failure = err instanceof Error ? err.message : "Impossible d'envoyer le fichier";
    } finally {
      setUpload(null);
    }

    // Rafraichit aussi apres un echec partiel (des fichiers ou dossiers ont pu etre crees), puis affiche
    // l'erreur : refresh() efface le message d'erreur en cours.
    await refreshRef.current();
    if (failure) setError(failure);
  }

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    // Copie avant de vider l'input, dont la remise a zero vide aussi sa liste de fichiers.
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selected.length === 0) return;

    await startUpload(contentFromFiles(selected));
  }

  // Le handler `drop` global doit toujours appeler la version la plus recente (dossier courant, etat).
  const dropRef = useRef<(dataTransfer: DataTransfer) => void>(() => {});
  useEffect(() => {
    dropRef.current = (dataTransfer) => {
      if (upload !== null) return;
      // contentFromDrop lit dataTransfer de facon synchrone, avant que le navigateur ne l'invalide.
      contentFromDrop(dataTransfer)
        .then(startUpload)
        .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de lire le dossier déposé'));
    };
  });

  // Glisser-deposer sur toute la fenetre (desktop) : evite aussi que le navigateur n'ouvre le fichier
  // depose a cote de la zone. Le compteur gere les dragenter/dragleave emis par chaque element traverse.
  useEffect(() => {
    if (isMobile) return;

    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

    function handleDragEnter(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setIsDragging(true);
    }

    function handleDragOver(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }

    function handleDragLeave(event: DragEvent) {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    }

    function handleDrop(event: DragEvent) {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      depth = 0;
      setIsDragging(false);
      dropRef.current(event.dataTransfer);
    }

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      setIsDragging(false);
    };
  }, [isMobile]);

  function startRename(entry: RenamingEntry) {
    setRenaming(entry);
  }

  function handleRenameSubmit(event: FormEvent) {
    event.preventDefault();
    if (!renaming) return;
    return submitRename(renaming.value);
  }

  async function submitRename(rawName: string) {
    if (!renaming) return;
    const name = rawName.trim();
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

  async function handleDownloadFolder(folder: Folder) {
    try {
      await downloadFolder(folder.id, folder.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de télécharger le dossier');
    }
  }

  function folderActions(folder: Folder): MenuAction[] {
    return [
      { label: 'Télécharger', onClick: () => handleDownloadFolder(folder) },
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
  // Sur mobile le renommage passe par une feuille (NameSheet), pas par un formulaire dans la ligne.
  const inlineRenaming = isMobile ? null : renaming;

  return (
    <div>
      {isDragging && (
        <div className="explorer__dropzone" aria-hidden="true">
          <IconUpload width={40} height={40} strokeWidth={1.3} />
          <p>Déposez vos fichiers ou dossiers ici</p>
        </div>
      )}
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
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleUploadChange} />
          <button
            type="button"
            className="button button--secondary explorer__action-upload"
            disabled={upload !== null}
            aria-label="Envoyer un fichier"
            onClick={() => (isMobile ? setIsChoosingUpload(true) : fileInputRef.current?.click())}
          >
            <IconUpload />
            <span className="button__label">{upload !== null ? `Envoi… ${upload.percent}%` : 'Envoyer un fichier'}</span>
          </button>
          {/* Sur mobile le selecteur de dossier n'est pas fiable (iOS) : l'envoi de dossier reste desktop. */}
          {!isMobile && (
            <>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                hidden
                onChange={handleUploadChange}
                {...{ webkitdirectory: '' }}
              />
              <button
                type="button"
                className="button button--secondary"
                disabled={upload !== null}
                onClick={() => folderInputRef.current?.click()}
              >
                <IconFolder />
                <span className="button__label">Envoyer un dossier</span>
              </button>
            </>
          )}
          <button
            type="button"
            className="button explorer__action-new-folder"
            aria-label="Nouveau dossier"
            onClick={() => setIsCreatingFolder(true)}
          >
            <IconNewFolder />
            <span className="button__label">Nouveau dossier</span>
          </button>
        </div>
      </div>

      {upload !== null && (
        <>
          <div className="explorer__progress">
            <div className="explorer__progress-bar" style={{ width: `${upload.percent}%` }} />
          </div>
          <p className="explorer__progress-label">
            Envoi… {upload.percent}%
            {upload.totalFiles > 1 && ` · ${upload.sentFiles}/${upload.totalFiles} fichiers`}
          </p>
        </>
      )}

      {isCreatingFolder && !isMobile && (
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
                  <td className="cell-name">
                    {inlineRenaming?.type === 'folder' && inlineRenaming.id === folder.id ? (
                      <form className="explorer__inline-form" onSubmit={handleRenameSubmit}>
                        <input
                          type="text"
                          autoFocus
                          value={inlineRenaming.value}
                          onChange={(event) => setRenaming({ ...inlineRenaming, value: event.target.value })}
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
                        <RowName
                          icon={<IconFolder className="explorer-row__icon" />}
                          name={folder.name}
                          meta={`Modifié le ${formatDate(folder.updatedAt)}`}
                        />
                      </button>
                    )}
                  </td>
                  <td className="cell-secondary">—</td>
                  <td className="cell-secondary">{formatDate(folder.updatedAt)}</td>
                  <td className="explorer-row__actions">
                    <ActionsMenu
                      actions={folderActions(folder)}
                      isOpen={openMenuId === folder.id}
                      onToggle={() => setOpenMenuId((current) => (current === folder.id ? null : folder.id))}
                      onClose={() => setOpenMenuId(null)}
                      label={`Actions pour ${folder.name}`}
                      title={folder.name}
                    />
                  </td>
                </tr>
              ))}
              {files.map((file) => (
                <tr key={file.id}>
                  <td className="cell-name">
                    {inlineRenaming?.type === 'file' && inlineRenaming.id === file.id ? (
                      <form className="explorer__inline-form" onSubmit={handleRenameSubmit}>
                        <input
                          type="text"
                          autoFocus
                          value={inlineRenaming.value}
                          onChange={(event) => setRenaming({ ...inlineRenaming, value: event.target.value })}
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
                        <RowName
                          icon={<IconFile className="explorer-row__icon" />}
                          name={file.name}
                          meta={`${formatSize(file.sizeBytes)} · ${formatDate(file.updatedAt)}`}
                        />
                      </button>
                    )}
                  </td>
                  <td className="cell-secondary">{formatSize(file.sizeBytes)}</td>
                  <td className="cell-secondary">{formatDate(file.updatedAt)}</td>
                  <td className="explorer-row__actions">
                    <ActionsMenu
                      actions={fileActions(file)}
                      isOpen={openMenuId === file.id}
                      onToggle={() => setOpenMenuId((current) => (current === file.id ? null : file.id))}
                      onClose={() => setOpenMenuId(null)}
                      label={`Actions pour ${file.name}`}
                      title={file.name}
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
            inlineRenaming?.type === 'folder' && inlineRenaming.id === folder.id ? (
              <div key={folder.id} className="explorer-grid__item">
                <IconFolder width={28} height={28} strokeWidth={1.3} />
                <form className="explorer__inline-form explorer__inline-form--grid" onSubmit={handleRenameSubmit}>
                  <input
                    type="text"
                    autoFocus
                    value={inlineRenaming.value}
                    onChange={(event) => setRenaming({ ...inlineRenaming, value: event.target.value })}
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
                    title={folder.name}
                  />
                </div>
                <IconFolder width={28} height={28} strokeWidth={1.3} />
                <span className="explorer-grid__name">{folder.name}</span>
                <span className="explorer-grid__meta">{formatDate(folder.updatedAt)}</span>
              </div>
            ),
          )}
          {files.map((file) =>
            inlineRenaming?.type === 'file' && inlineRenaming.id === file.id ? (
              <div key={file.id} className="explorer-grid__item">
                <IconFile width={28} height={28} strokeWidth={1.3} />
                <form className="explorer__inline-form explorer__inline-form--grid" onSubmit={handleRenameSubmit}>
                  <input
                    type="text"
                    autoFocus
                    value={inlineRenaming.value}
                    onChange={(event) => setRenaming({ ...inlineRenaming, value: event.target.value })}
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
                    title={file.name}
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

      {isMobile && isCreatingFolder && (
        <NameSheet
          title="Nouveau dossier"
          placeholder="Nom du dossier"
          submitLabel="Créer"
          onSubmit={submitNewFolder}
          onClose={() => {
            setIsCreatingFolder(false);
            setNewFolderName('');
          }}
        />
      )}

      {isMobile && renaming && (
        <NameSheet
          title="Renommer"
          initialValue={renaming.value}
          submitLabel="Renommer"
          onSubmit={submitRename}
          onClose={() => setRenaming(null)}
        />
      )}

      {isMobile && isChoosingUpload && (
        <UploadSourceSheet onChange={handleUploadChange} onClose={() => setIsChoosingUpload(false)} />
      )}

      {moving && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal modal--fullscreen">
            <div className="modal__header">
              <h2 className="modal__title">Déplacer « {moving.name} »</h2>
              <button
                type="button"
                className="modal__close modal__close--mobile"
                onClick={() => setMoving(null)}
                aria-label="Fermer"
              >
                <IconClose />
              </button>
            </div>
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
