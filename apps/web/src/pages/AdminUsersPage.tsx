import { useCallback, useEffect, useState } from 'react';
import { AddUserModal } from '../components/AddUserModal';
import { ActionsMenu, type MenuAction } from '../components/ActionsMenu';
import { DeleteUserModal } from '../components/DeleteUserModal';
import { EditUserModal } from '../components/EditUserModal';
import { IconUserPlus } from '../components/icons';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { type AdminUser, approveUser, isPending, listUsers } from '../lib/users-api';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listUsers();
      setUsers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les utilisateurs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleApprove(user: AdminUser) {
    setError(null);
    try {
      await approveUser(user.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de valider l'inscription");
    }
  }

  function actionsFor(user: AdminUser): MenuAction[] {
    const actions: MenuAction[] = [];
    if (isPending(user)) {
      actions.push({ label: "Valider l'inscription", onClick: () => handleApprove(user) });
    }
    actions.push(
      { label: 'Modifier', onClick: () => setEditing(user) },
      { label: 'Réinitialiser le mot de passe', onClick: () => setResetting(user) },
      { label: 'Supprimer', onClick: () => setDeleting(user), danger: true },
    );
    return actions;
  }

  const sortedUsers = [...users].sort((a, b) => Number(isPending(b)) - Number(isPending(a)));

  function formatDate(value: string | Date): string {
    return new Date(value).toLocaleDateString('fr-FR');
  }

  return (
    <div>
      <div className="explorer__header">
        <div>
          <h1>Administration</h1>
          <p className="explorer__empty-subtitle">Gestion des comptes utilisateurs</p>
        </div>
        <div className="explorer__actions">
          <button type="button" className="button" onClick={() => setIsAdding(true)}>
            <IconUserPlus />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {error && <p className="explorer__error">{error}</p>}

      {isLoading ? (
        <div className="explorer__empty">
          <p className="explorer__empty-title">Chargement…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="explorer__empty">
          <p className="explorer__empty-title">Aucun utilisateur.</p>
        </div>
      ) : (
        <div className="explorer-table-wrapper">
          <table className="explorer-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge${user.role === 'ADMIN' ? ' role-badge--admin' : ''}`}>{user.role}</span>
                  </td>
                  <td>
                    {isPending(user) ? (
                      <span className="role-badge role-badge--pending">En attente</span>
                    ) : (
                      <span className="role-badge">Actif</span>
                    )}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td className="explorer-row__actions">
                    <ActionsMenu
                      actions={actionsFor(user)}
                      isOpen={openMenuId === user.id}
                      onToggle={() => setOpenMenuId((current) => (current === user.id ? null : user.id))}
                      onClose={() => setOpenMenuId(null)}
                      label={`Actions pour ${user.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdding && <AddUserModal onClose={() => setIsAdding(false)} onSaved={refresh} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} onSaved={refresh} />}
      {deleting && <DeleteUserModal user={deleting} onClose={() => setDeleting(null)} onSaved={refresh} />}
    </div>
  );
}
