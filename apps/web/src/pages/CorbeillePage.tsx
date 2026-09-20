import { useCallback, useEffect, useState } from 'react';
import { ActionsMenu, type MenuAction } from '../components/ActionsMenu';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconFile, IconFolder, IconTrash } from '../components/icons';
import { RowName } from '../components/RowName';
import {
  type FileEntry,
  type Folder,
  formatDate,
  formatSize,
  listTrash,
  permanentlyDeleteFile,
  permanentlyDeleteFolder,
  restoreFile,
  restoreFolder,
} from '../lib/files-api';

const RETENTION_DAYS = 7;

function purgeDate(deletedAt: string | null): string {
  if (!deletedAt) return '—';
  const date = new Date(deletedAt);
  date.setDate(date.getDate() + RETENTION_DAYS);
  return date.toLocaleDateString('fr-FR');
}

interface PendingDeletion {
  type: 'folder' | 'file';
  id: string;
  name: string;
}

export function CorbeillePage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const contents = await listTrash();
      setFolders(contents.folders);
      setFiles(contents.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la corbeille');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRestoreFolder(folder: Folder) {
    try {
      await restoreFolder(folder.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de restaurer le dossier');
    }
  }

  async function handleRestoreFile(file: FileEntry) {
    try {
      await restoreFile(file.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de restaurer le fichier');
    }
  }

  async function handlePermanentDeleteFolder(folder: Folder) {
    try {
      await permanentlyDeleteFolder(folder.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer définitivement le dossier');
    }
  }

  async function handlePermanentDeleteFile(file: FileEntry) {
    try {
      await permanentlyDeleteFile(file.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer définitivement le fichier');
    }
  }

  function folderActions(folder: Folder): MenuAction[] {
    return [
      { label: 'Restaurer', onClick: () => handleRestoreFolder(folder) },
      {
        label: 'Supprimer définitivement',
        onClick: () => setPendingDeletion({ type: 'folder', id: folder.id, name: folder.name }),
        danger: true,
      },
    ];
  }

  function fileActions(file: FileEntry): MenuAction[] {
    return [
      { label: 'Restaurer', onClick: () => handleRestoreFile(file) },
      {
        label: 'Supprimer définitivement',
        onClick: () => setPendingDeletion({ type: 'file', id: file.id, name: file.name }),
        danger: true,
      },
    ];
  }

  const isEmpty = !isLoading && folders.length === 0 && files.length === 0;

  return (
    <div>
      <div className="explorer__header">
        <div>
          <h1>Corbeille</h1>
          <p className="explorer__empty-subtitle">
            Les éléments supprimés sont conservés {RETENTION_DAYS} jours avant suppression définitive automatique.
          </p>
        </div>
      </div>

      {error && <p className="explorer__error">{error}</p>}

      {isLoading ? (
        <div className="explorer__empty">
          <p className="explorer__empty-title">Chargement…</p>
        </div>
      ) : isEmpty ? (
        <div className="explorer__empty">
          <IconTrash width={40} height={40} strokeWidth={1.3} />
          <p className="explorer__empty-title">La corbeille est vide.</p>
        </div>
      ) : (
        <div className="explorer-table-wrapper">
          <table className="explorer-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Taille</th>
                <th>Supprimé le</th>
                <th>Purge auto. le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {folders.map((folder) => (
                <tr key={folder.id}>
                  <td className="cell-name">
                    <span className="explorer-row__name">
                      <RowName
                        icon={<IconFolder className="explorer-row__icon" />}
                        name={folder.name}
                        meta={`Supprimé le ${folder.deletedAt ? formatDate(folder.deletedAt) : '—'} · Purge le ${purgeDate(folder.deletedAt)}`}
                      />
                    </span>
                  </td>
                  <td className="cell-secondary">—</td>
                  <td className="cell-secondary">{folder.deletedAt ? formatDate(folder.deletedAt) : '—'}</td>
                  <td className="cell-secondary">{purgeDate(folder.deletedAt)}</td>
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
                    <span className="explorer-row__name">
                      <RowName
                        icon={<IconFile className="explorer-row__icon" />}
                        name={file.name}
                        meta={`${formatSize(file.sizeBytes)} · Supprimé le ${file.deletedAt ? formatDate(file.deletedAt) : '—'} · Purge le ${purgeDate(file.deletedAt)}`}
                      />
                    </span>
                  </td>
                  <td className="cell-secondary">{formatSize(file.sizeBytes)}</td>
                  <td className="cell-secondary">{file.deletedAt ? formatDate(file.deletedAt) : '—'}</td>
                  <td className="cell-secondary">{purgeDate(file.deletedAt)}</td>
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
      )}

      {pendingDeletion && (
        <ConfirmModal
          title="Suppression définitive"
          message={
            pendingDeletion.type === 'folder'
              ? `Supprimer définitivement le dossier « ${pendingDeletion.name} » et tout son contenu ? Cette action est irréversible.`
              : `Supprimer définitivement le fichier « ${pendingDeletion.name} » ? Cette action est irréversible.`
          }
          confirmLabel="Supprimer"
          danger
          onConfirm={() => {
            const target = pendingDeletion;
            const folder = folders.find((entry) => entry.id === target.id);
            const file = files.find((entry) => entry.id === target.id);
            if (target.type === 'folder' && folder) void handlePermanentDeleteFolder(folder);
            if (target.type === 'file' && file) void handlePermanentDeleteFile(file);
          }}
          onClose={() => setPendingDeletion(null)}
        />
      )}
    </div>
  );
}
