// VITE_API_URL est une origine optionnelle (dev hote sans Docker, ou docker-compose.dev.yml) ;
// vide par defaut = chemins relatifs, comme attendu derriere le reverse proxy Nginx unique
// de production (etape 10), qui expose l'API sous /api/*.
const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface FolderContents {
  folders: Folder[];
  files: FileEntry[];
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export function updateFolder(id: string, changes: { name?: string; parentId?: string | null }): Promise<Folder> {
  return request<Folder>(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export function deleteFolder(id: string): Promise<void> {
  return request<void>(`/folders/${id}`, { method: 'DELETE' });
}

function parseXhrErrorMessage(xhr: XMLHttpRequest): string {
  try {
    const body: unknown = JSON.parse(xhr.responseText);
    return extractErrorMessage(body) ?? `Erreur ${xhr.status}`;
  } catch {
    return `Erreur ${xhr.status}`;
  }
}

export function uploadFile(file: File, folderId: string | null, onProgress?: (percent: number) => void): Promise<FileEntry> {
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
    xhr.send(formData);
  });
}

export function updateFile(id: string, changes: { name?: string; folderId?: string | null }): Promise<FileEntry> {
  return request<FileEntry>(`/files/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export function deleteFile(id: string): Promise<void> {
  return request<void>(`/files/${id}`, { method: 'DELETE' });
}

export async function downloadFile(id: string, name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/files/${id}/download`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
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
