import { type FormEvent, useEffect, useState } from 'react';
import { authClient, useSession } from '../lib/auth-client';
import { useIsMobile } from '../lib/use-media-query';
import { IconChevronLeft, IconClose } from './icons';
import { PasswordInput } from './PasswordInput';

interface AccountModalProps {
  onClose: () => void;
}

export function AccountModal({ onClose }: AccountModalProps) {
  const isMobile = useIsMobile();
  const { data: session } = useSession();

  const [name, setName] = useState(session?.user.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleNameSubmit(event: FormEvent) {
    event.preventDefault();
    setNameError(null);
    setNameSuccess(false);
    setIsSavingName(true);
    try {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) throw new Error(error.message ?? 'Impossible de mettre à jour le nom');
      setNameSuccess(true);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Impossible de mettre à jour le nom');
    } finally {
      setIsSavingName(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les deux mots de passe ne correspondent pas');
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (error) throw new Error(error.message ?? 'Impossible de changer le mot de passe');
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Impossible de changer le mot de passe');
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--fullscreen" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Mon compte</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            {isMobile ? <IconChevronLeft width={18} height={18} /> : <IconClose />}
          </button>
        </div>

        <form onSubmit={handleNameSubmit}>
          <div className="field">
            <label htmlFor="account-name">Nom</label>
            <input id="account-name" type="text" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          {nameError && <p className="explorer__error">{nameError}</p>}
          {nameSuccess && <p className="field__hint">Nom mis à jour.</p>}

          <div className="modal__actions">
            <button type="submit" className="button" disabled={isSavingName}>
              Enregistrer
            </button>
          </div>
        </form>

        <hr className="modal__divider" />

        <form onSubmit={handlePasswordSubmit}>
          <div className="field">
            <label htmlFor="account-current-password">Mot de passe actuel</label>
            <PasswordInput
              id="account-current-password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="account-new-password">Nouveau mot de passe</label>
            <PasswordInput
              id="account-new-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="account-confirm-password">Vérification du mot de passe</label>
            <PasswordInput
              id="account-confirm-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {passwordError && <p className="explorer__error">{passwordError}</p>}
          {passwordSuccess && <p className="field__hint">Mot de passe mis à jour.</p>}

          <div className="modal__actions">
            <button type="button" className="button button--secondary" onClick={onClose}>
              Fermer
            </button>
            <button type="submit" className="button" disabled={isSavingPassword}>
              Changer le mot de passe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
