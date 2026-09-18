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

export type ActivityTargetType = 'file' | 'folder';
