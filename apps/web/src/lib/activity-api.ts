import { request } from './files-api';

export type ActivityAction =
  | 'file.created'
  | 'file.renamed'
  | 'file.moved'
  | 'file.trashed'
  | 'file.restored'
  | 'file.deleted'
  | 'folder.created'
  | 'folder.renamed'
  | 'folder.moved'
  | 'folder.trashed'
  | 'folder.restored'
  | 'folder.deleted';

export interface ActivityEvent {
  id: string;
  actorId: string | null;
  actorName: string;
  action: ActivityAction;
  targetType: 'file' | 'folder';
  targetId: string;
  targetName: string;
  createdAt: string;
}

export function listActivity(): Promise<ActivityEvent[]> {
  return request<ActivityEvent[]>('/activity');
}

const ACTION_LABELS: Record<ActivityAction, string> = {
  'file.created': 'a créé le fichier',
  'file.renamed': 'a renommé le fichier',
  'file.moved': 'a déplacé le fichier',
  'file.trashed': 'a mis à la corbeille le fichier',
  'file.restored': 'a restauré le fichier',
  'file.deleted': 'a définitivement supprimé le fichier',
  'folder.created': 'a créé le dossier',
  'folder.renamed': 'a renommé le dossier',
  'folder.moved': 'a déplacé le dossier',
  'folder.trashed': 'a mis à la corbeille le dossier',
  'folder.restored': 'a restauré le dossier',
  'folder.deleted': 'a définitivement supprimé le dossier',
};

export function describeActivity(event: ActivityEvent): string {
  return `${ACTION_LABELS[event.action]} « ${event.targetName} »`;
}
