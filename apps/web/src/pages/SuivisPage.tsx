import { useCallback, useEffect, useState } from 'react';
import { ActionsMenu, type MenuAction } from '../components/ActionsMenu';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { IconFile, IconFolder, IconStar } from '../components/icons';
import {
  downloadFile,
  type FileEntry,
  type Folder,
  formatDate,
  formatSize,
  listFavorites,
  updateFile,
  updateFolder,
} from '../lib/files-api';

export function SuivisPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewingFile, setPreviewingFile] = useState<FileEntry | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const contents = await listFavorites();
      setFolders(contents.folders);
      setFiles(contents.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les favoris');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRemoveFolderFavorite(folder: Folder) {
    try {
      await updateFolder(folder.id, { isFavorite: false });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de retirer des favoris');
    }
  }

  async function handleRemoveFileFavorite(file: FileEntry) {
    try {
      await updateFile(file.id, { isFavorite: false });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de retirer des favoris');
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
    return [{ label: 'Retirer des favoris', onClick: () => handleRemoveFolderFavorite(folder) }];
  }

  function fileActions(file: FileEntry): MenuAction[] {
    return [
      { label: 'Télécharger', onClick: () => handleDownload(file) },
      { label: 'Retirer des favoris', onClick: () => handleRemoveFileFavorite(file) },
    ];
  }

  const isEmpty = !isLoading && folders.length === 0 && files.length === 0;

  return (
    <div>
      <div className="explorer__header">
        <div>
          <h1>Suivis</h1>
          <p className="explorer__empty-subtitle">Fichiers et dossiers ajoutés aux favoris</p>
        </div>
      </div>

      {error && <p className="explorer__error">{error}</p>}

      {isLoading ? (
        <div className="explorer__empty">
          <p className="explorer__empty-title">Chargement…</p>
        </div>
      ) : isEmpty ? (
        <div className="explorer__empty">
          <IconStar width={40} height={40} strokeWidth={1.3} />
          <p className="explorer__empty-title">Aucun favori pour le moment.</p>
          <p className="explorer__empty-subtitle">
            Ajoutez un fichier ou un dossier aux favoris depuis son menu ⋮ dans l'explorateur.
          </p>
        </div>
      ) : (
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
                    <span className="explorer-row__name">
                      <IconFolder className="explorer-row__icon" />
                      {folder.name}
                    </span>
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
                    <button
                      type="button"
                      className="explorer-row__name explorer-row__link"
                      onClick={() => setPreviewingFile(file)}
                    >
                      <IconFile className="explorer-row__icon" />
                      {file.name}
                    </button>
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
      )}

      {previewingFile && <FilePreviewModal file={previewingFile} onClose={() => setPreviewingFile(null)} />}
    </div>
  );
}
