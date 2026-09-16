import { type FormEvent, useEffect, useState } from 'react';
import { type AdminUser, resetUserPassword } from '../lib/users-api';
import { IconClose } from './icons';
import { PasswordInput } from './PasswordInput';

interface ResetPasswordModalProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

export function ResetPasswordModal({ user, onClose, onSaved }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetUserPassword(user.id, password);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de réinitialiser le mot de passe');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Réinitialiser le mot de passe</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <IconClose />
          </button>
        </div>

        <p className="explorer__empty-subtitle">
          Nouveau mot de passe pour {user.name} ({user.email}).
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="reset-password-new">Nouveau mot de passe</label>
            <PasswordInput
              id="reset-password-new"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="reset-password-confirm">Vérification du mot de passe</label>
            <PasswordInput
              id="reset-password-confirm"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {error && <p className="explorer__error">{error}</p>}

          <div className="modal__actions">
            <button type="button" className="button button--secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="button" disabled={isSubmitting}>
              Réinitialiser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
