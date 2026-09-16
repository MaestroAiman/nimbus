import { type FormEvent, useEffect, useState } from 'react';
import { useSession } from '../lib/auth-client';
import { type AdminUser, type Role, updateUser } from '../lib/users-api';
import { IconClose } from './icons';
import { Select } from './Select';

const ROLE_OPTIONS = [
  { value: 'USER', label: 'Utilisateur' },
  { value: 'ADMIN', label: 'Administrateur' },
];

interface EditUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

export function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const { data: session } = useSession();
  const isEditingSelf = session?.user.id === user.id;

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await updateUser(user.id, { name: name.trim(), email: email.trim(), role });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier l'utilisateur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Modifier l'utilisateur</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="edit-user-name">Nom</label>
            <input id="edit-user-name" type="text" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="edit-user-email">Email</label>
            <input
              id="edit-user-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="edit-user-role">Rôle</label>
            <Select
              id="edit-user-role"
              value={role}
              options={ROLE_OPTIONS}
              onChange={(value) => setRole(value as Role)}
              disabled={isEditingSelf}
            />
            {isEditingSelf && <p className="field__hint">Vous ne pouvez pas modifier votre propre rôle.</p>}
          </div>

          {error && <p className="explorer__error">{error}</p>}

          <div className="modal__actions">
            <button type="button" className="button button--secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="button" disabled={isSubmitting}>
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
