import { type FormEvent, useEffect, useState } from 'react';
import { createUser, type Role } from '../lib/users-api';
import { IconClose } from './icons';
import { PasswordInput } from './PasswordInput';
import { Select } from './Select';

const ROLE_OPTIONS = [
  { value: 'USER', label: 'Utilisateur' },
  { value: 'ADMIN', label: 'Administrateur' },
];

interface AddUserModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddUserModal({ onClose, onSaved }: AddUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('USER');
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

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({ name: name.trim(), email: email.trim(), password, role });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer l'utilisateur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Nouvel utilisateur</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="add-user-name">Nom</label>
            <input id="add-user-name" type="text" autoFocus required value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="add-user-email">Email</label>
            <input
              id="add-user-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="add-user-password">Mot de passe</label>
            <PasswordInput
              id="add-user-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="add-user-role">Rôle</label>
            <Select id="add-user-role" value={role} options={ROLE_OPTIONS} onChange={(value) => setRole(value as Role)} />
          </div>

          {error && <p className="explorer__error">{error}</p>}

          <div className="modal__actions">
            <button type="button" className="button button--secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="button" disabled={isSubmitting}>
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
