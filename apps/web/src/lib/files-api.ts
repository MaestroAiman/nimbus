// VITE_API_URL est une origine optionnelle (dev hote sans Docker, ou docker-compose.dev.yml) ;
// vide par defaut = chemins relatifs, comme attendu derriere le reverse proxy Nginx unique
// de production (etape 10), qui expose l'API sous /api/*.
export const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  isFavorite: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileEntry {
  id: string;
  name: string;
  ownerId: string;
  folderId: string | null;
  sizeBytes: number;
  mimeType: string;
  diskPath: string;
  isFavorite: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorageUsage {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
}

export interface FolderContents {
  folders: Folder[];
  files: FileEntry[];
}

export interface FileProperties {
  // Noms des dossiers parents, du premier sous la racine jusqu'au dossier qui contient le fichier.
  path: string[];
}

export interface FolderProperties extends FileProperties {
  sizeBytes: number;
  fileCount: number;
  folderCount: number;
}

function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('message' in body)) return undefined;
  const message = (body as { message: unknown }).message;

  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return extractErrorMessage(message);
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    return extractErrorMessage(body) ?? `Erreur ${response.status}`;
  } catch {
    return `Erreur ${response.status}`;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json', ...init.headers }
        : init?.headers,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function listFolder(parentId: string | null): Promise<FolderContents> {
  const query = parentId ? `?parentId=${encodeURIComponent(parentId)}` : '';
  return request<FolderContents>(`/folders${query}`);
}

export function createFolder(name: string, parentId: string | null): Promise<Folder> {
  return request<Folder>('/folders', { method: 'POST', body: JSON.stringify({ name, parentId }) });
}

export function updateFolder(
  id: string,
  changes: { name?: string; parentId?: string | null; isFavorite?: boolean },
): Promise<Folder> {
  return request<Folder>(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export function getFolderProperties(id: string): Promise<FolderProperties> {
  return request<FolderProperties>(`/folders/${id}/properties`);
}

export function getFileProperties(id: string): Promise<FileProperties> {
  return request<FileProperties>(`/files/${id}/properties`);
}

export function deleteFolder(id: string): Promise<void> {
  return request<void>(`/folders/${id}`, { method: 'DELETE' });
}

export function restoreFolder(id: string): Promise<void> {
  return request<void>(`/folders/${id}/restore`, { method: 'POST' });
}

export function permanentlyDeleteFolder(id: string): Promise<void> {
  return request<void>(`/folders/${id}/permanent`, { method: 'DELETE' });
}

function parseXhrErrorMessage(xhr: XMLHttpRequest): string {
  try {
    const body: unknown = JSON.parse(xhr.responseText);
    return extractErrorMessage(body) ?? `Erreur ${xhr.status}`;
  } catch {
    return `Erreur ${xhr.status}`;
  }
}

export interface FolderTree {
  root: Folder;
  // Chemin relatif a la racine ("" = racine elle-meme) -> id du dossier cree.
  folders: Record<string, string>;
}

// Cree la racine (renommee "Nom (2)" si le nom est pris) et tous ses sous-dossiers en une requete.
export function createFolderTree(parentId: string | null, rootName: string, dirs: string[]): Promise<FolderTree> {
  return request<FolderTree>('/folders/tree', { method: 'POST', body: JSON.stringify({ parentId, rootName, dirs }) });
}

export function uploadFile(
  file: File,
  folderId: string | null,
  onProgress?: (percent: number) => void,
  // `silent` : pas d'evenement d'activite (fichiers d'un dossier envoye, l'evenement du dossier suffit).
  options?: { silent?: boolean },
): Promise<FileEntry> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/files`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve((xhr.responseText ? JSON.parse(xhr.responseText) : undefined) as FileEntry);
      } else {
        reject(new Error(parseXhrErrorMessage(xhr)));
      }
    };

    xhr.onerror = () => reject(new Error("Erreur reseau lors de l'envoi du fichier"));

    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);
    if (options?.silent) formData.append('silent', 'true');
    xhr.send(formData);
  });
}

export function updateFile(
  id: string,
  changes: { name?: string; folderId?: string | null; isFavorite?: boolean },
): Promise<FileEntry> {
  return request<FileEntry>(`/files/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export function deleteFile(id: string): Promise<void> {
  return request<void>(`/files/${id}`, { method: 'DELETE' });
}

export function restoreFile(id: string): Promise<void> {
  return request<void>(`/files/${id}/restore`, { method: 'POST' });
}

export function permanentlyDeleteFile(id: string): Promise<void> {
  return request<void>(`/files/${id}/permanent`, { method: 'DELETE' });
}

export async function fetchFileBlob(id: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/files/${id}/download`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.blob();
}

// Lien direct vers l'API plutot que fetch + blob : le navigateur telecharge en streaming
// vers le disque (pas de copie du fichier en memoire, pas de blob: a revoquer). Avec l'ancien
// fetch+blob, revoquer l'URL juste apres le clic faisait echouer les gros fichiers. Le cookie
// de session part avec le lien (meme origine) ; le nom vient de Content-Disposition.
function triggerDownload(href: string, name: string): Promise<void> {
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return Promise.resolve();
}

export function downloadFile(id: string, name: string): Promise<void> {
  return triggerDownload(`${API_BASE}/files/${id}/download`, name);
}

// Meme principe pour un dossier : l'API genere le ZIP a la volee, le navigateur l'ecrit sur disque
// au fil de l'eau. Le nom reel (avec l'extension .zip) vient de Content-Disposition.
export function downloadFolder(id: string, name: string): Promise<void> {
  return triggerDownload(`${API_BASE}/folders/${id}/download`, `${name}.zip`);
}

export function listFavorites(): Promise<FolderContents> {
  return request<FolderContents>('/favorites');
}

export function listTrash(): Promise<FolderContents> {
  return request<FolderContents>('/trash');
}

export function getStorageUsage(): Promise<StorageUsage> {
  return request<StorageUsage>('/storage');
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const units = ['Ko', 'Mo', 'Go'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR');
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR');
}

// « lundi 21 septembre 2026, 15:59:56 », comme la fenetre Proprietes de Windows.
export function formatDateLong(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'medium' });
}

// « 489 Mo (512 868 975 octets) »
export function formatExactSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} octets`;
  return `${formatSize(bytes)} (${bytes.toLocaleString('fr-FR')} octets)`;
}

export function formatPath(path: string[]): string {
  return ['Racine', ...path].join(' / ');
}

export function fileTypeLabel(mimeType: string, name: string): string {
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : null;
  const suffix = extension ? ` (.${extension})` : '';
  const upper = extension ? ` ${extension.toUpperCase()}` : '';

  if (mimeType === 'application/pdf') return `Document PDF${suffix}`;
  if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') return `Dossier compressé${suffix}`;
  if (mimeType.startsWith('image/')) return `Image${upper}${suffix}`;
  if (mimeType.startsWith('video/')) return `Vidéo${upper}${suffix}`;
  if (mimeType.startsWith('audio/')) return `Audio${upper}${suffix}`;
  if (mimeType.startsWith('text/')) return `Document texte${suffix}`;
  return `Fichier${upper}${suffix}`;
}
