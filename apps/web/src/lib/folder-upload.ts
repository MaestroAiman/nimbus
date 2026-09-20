import { createFolderTree, uploadFile } from './files-api';

// Un dossier local a envoyer : `dirs` et `dir` sont des chemins relatifs a la racine ("" = racine).
export interface UploadTree {
  rootName: string;
  dirs: string[];
  files: { file: File; dir: string }[];
}

// Ce que l'utilisateur a choisi ou depose : des dossiers entiers et/ou des fichiers isoles.
export interface UploadContent {
  trees: UploadTree[];
  looseFiles: File[];
}

export interface UploadProgress {
  percent: number;
  sentFiles: number;
  totalFiles: number;
}

export interface UploadSummary {
  totalFiles: number;
  failedFiles: number;
  // Premier message d'erreur rencontre (les autres fichiers continuent d'etre envoyes).
  error?: string;
}

const CONCURRENT_UPLOADS = 3;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Impossible d'envoyer le fichier";
}

/**
 * Contenu d'un <input type="file"> : fichiers isoles, ou dossiers si l'input est en `webkitdirectory`
 * (chaque fichier porte alors son chemin, `Photos/2024/a.jpg`).
 * Limite du navigateur : les dossiers locaux vides n'apparaissent pas dans cette liste.
 */
export function contentFromFiles(files: File[]): UploadContent {
  const trees = new Map<string, UploadTree>();
  const looseFiles: File[] = [];

  for (const file of files) {
    const segments = file.webkitRelativePath.split('/');
    if (segments.length < 2) {
      looseFiles.push(file);
      continue;
    }

    const [rootName, ...rest] = segments;
    const dir = rest.slice(0, -1).join('/');
    let tree = trees.get(rootName);
    if (!tree) {
      tree = { rootName, dirs: [], files: [] };
      trees.set(rootName, tree);
    }
    // L'API complete elle-meme les ancetres d'un chemin ("a/b" cree aussi "a").
    if (dir && !tree.dirs.includes(dir)) tree.dirs.push(dir);
    tree.files.push({ file, dir });
  }

  return { trees: [...trees.values()], looseFiles };
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];
    // readEntries ne renvoie qu'un lot (100 max) : on relit jusqu'a obtenir un lot vide.
    const readNext = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries);
        } else {
          entries.push(...batch);
          readNext();
        }
      }, reject);
    readNext();
  });
}

function readFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function walkDirectory(entry: FileSystemDirectoryEntry, dir: string, tree: UploadTree): Promise<void> {
  for (const child of await readAllEntries(entry.createReader())) {
    if (child.isFile) {
      tree.files.push({ file: await readFile(child as FileSystemFileEntry), dir });
    } else {
      const childDir = dir ? `${dir}/${child.name}` : child.name;
      tree.dirs.push(childDir);
      await walkDirectory(child as FileSystemDirectoryEntry, childDir, tree);
    }
  }
}

/**
 * Contenu d'un glisser-deposer, dossiers vides compris.
 * A appeler de facon synchrone dans le handler `drop` : le navigateur invalide `dataTransfer`
 * des que le handler rend la main, d'ou l'extraction des entrees avant le premier `await`.
 */
export function contentFromDrop(dataTransfer: DataTransfer): Promise<UploadContent> {
  const entries: FileSystemEntry[] = [];
  const looseFiles: File[] = [];

  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== 'file') continue;
    const entry = item.webkitGetAsEntry();
    if (entry) {
      entries.push(entry);
    } else {
      const file = item.getAsFile();
      if (file) looseFiles.push(file);
    }
  }

  return (async () => {
    const trees: UploadTree[] = [];

    for (const entry of entries) {
      if (entry.isFile) {
        looseFiles.push(await readFile(entry as FileSystemFileEntry));
      } else {
        const tree: UploadTree = { rootName: entry.name, dirs: [], files: [] };
        await walkDirectory(entry as FileSystemDirectoryEntry, '', tree);
        trees.push(tree);
      }
    }

    return { trees, looseFiles };
  })();
}

interface UploadJob {
  file: File;
  folderId: string | null;
  silent: boolean;
}

/**
 * Cree les dossiers puis envoie tous les fichiers (3 a la fois) avec une progression globale en
 * octets. Un fichier en echec n'interrompt pas les autres : le bilan est rendu a la fin.
 */
export async function uploadContent(
  content: UploadContent,
  parentId: string | null,
  onProgress: (progress: UploadProgress) => void,
): Promise<UploadSummary> {
  // Compte aussi les fichiers d'une arborescence dont la creation echoue (ils n'entrent pas dans `jobs`).
  const totalFiles = content.looseFiles.length + content.trees.reduce((sum, tree) => sum + tree.files.length, 0);
  const jobs: UploadJob[] = content.looseFiles.map((file) => ({ file, folderId: parentId, silent: false }));
  let failedFiles = 0;
  let error: string | undefined;

  for (const tree of content.trees) {
    try {
      const { folders } = await createFolderTree(parentId, tree.rootName, tree.dirs);
      // Fichiers silencieux : l'evenement d'activite du dossier suffit.
      jobs.push(...tree.files.map(({ file, dir }) => ({ file, folderId: folders[dir], silent: true })));
    } catch (err) {
      failedFiles += tree.files.length;
      error ??= errorMessage(err);
    }
  }

  const totalBytes = jobs.reduce((sum, job) => sum + job.file.size, 0);
  const loadedBytes = jobs.map(() => 0);
  let sentFiles = 0;

  function report() {
    const loaded = loadedBytes.reduce((sum, bytes) => sum + bytes, 0);
    const ratio = totalBytes > 0 ? loaded / totalBytes : sentFiles / jobs.length;
    onProgress({ percent: Math.round(ratio * 100), sentFiles, totalFiles: jobs.length });
  }

  // Un dossier vide (ou dont tous les fichiers ont echoue a la creation) n'a rien a envoyer.
  if (jobs.length > 0) report();

  let nextJob = 0;
  async function worker() {
    while (nextJob < jobs.length) {
      const index = nextJob++;
      const job = jobs[index];

      try {
        await uploadFile(
          job.file,
          job.folderId,
          (percent) => {
            loadedBytes[index] = (percent / 100) * job.file.size;
            report();
          },
          { silent: job.silent },
        );
      } catch (err) {
        failedFiles += 1;
        error ??= errorMessage(err);
      } finally {
        loadedBytes[index] = job.file.size;
        sentFiles += 1;
        report();
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENT_UPLOADS, jobs.length) }, worker));

  return { totalFiles, failedFiles, error };
}
