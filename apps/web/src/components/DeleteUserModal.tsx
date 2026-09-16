import { useEffect, useState } from 'react';
import { type AdminUser, deleteUser } from '../lib/users-api';
import { IconClose } from './icons';

interface DeleteUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

export function DeleteUserModal({ user, onClose, onSaved }: DeleteUserModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteUser(user.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer l'utilisateur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Supprimer l'utilisateur</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <IconClose />
          </button>
        </div>

        <p>
          Supprimer définitivement <strong>{user.name}</strong> ({user.email}) ? Tous ses fichiers et dossiers seront
          également supprimés. Cette action est irréversible.
        </p>

        {error && <p className="explorer__error">{error}</p>}

        <div className="modal__actions">
          <button type="button" className="button button--secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="button button--danger" disabled={isSubmitting} onClick={handleConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
