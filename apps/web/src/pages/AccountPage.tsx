import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AccountModal } from '../components/AccountModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconBell, IconChevronRight, IconLogout, IconUser, IconUsers } from '../components/icons';
import { NotificationsModal } from '../components/NotificationsModal';
import { signOut, useSession } from '../lib/auth-client';
import { formatSize, getStorageUsage, type StorageUsage } from '../lib/files-api';
import { useIsMobile } from '../lib/use-media-query';

type Panel = 'account' | 'notifications' | 'logout' | null;

interface Row {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  danger?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

// Onglet "Compte" de la navigation mobile : sur desktop ces actions vivent dans la barre laterale.
export function AccountPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    getStorageUsage()
      .then(setStorageUsage)
      .catch(() => setStorageUsage(null));
  }, []);

  if (!isMobile) return <Navigate to="/explorer" replace />;
  if (!session) return null;

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const rows: Row[] = [
    { label: 'Notifications', icon: IconBell, onClick: () => setPanel('notifications') },
    { label: 'Modifier le profil', icon: IconUser, onClick: () => setPanel('account') },
  ];
  if (session.user.role === 'ADMIN') {
    rows.push({ label: 'Administration', icon: IconUsers, onClick: () => navigate('/admin/users') });
  }
  rows.push({ label: 'Se déconnecter', icon: IconLogout, onClick: () => setPanel('logout'), danger: true });

  return (
    <div>
      <div className="explorer__header">
        <h1>Compte</h1>
      </div>

      <div className="account-card">
        <div className="account-card__avatar">{getInitials(session.user.name)}</div>
        <div className="account-card__identity">
          <div className="account-card__name">{session.user.name}</div>
          <div className="account-card__email">{session.user.email}</div>
        </div>
      </div>

      {storageUsage && (
        <div className="account-card account-card--column">
          <div className="sidebar__storage-bar">
            <div
              className="sidebar__storage-bar-fill"
              style={{ width: `${Math.min(100, (storageUsage.usedBytes / storageUsage.totalBytes) * 100)}%` }}
            />
          </div>
          <span className="sidebar__storage-label">
            {formatSize(storageUsage.usedBytes)} utilisés sur {formatSize(storageUsage.totalBytes)}
          </span>
        </div>
      )}

      <div className="account-list">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            className={`account-list__row${row.danger ? ' account-list__row--danger' : ''}`}
            onClick={row.onClick}
          >
            <row.icon width={17} height={17} />
            <span className="account-list__label">{row.label}</span>
            {!row.danger && <IconChevronRight width={14} height={14} />}
          </button>
        ))}
      </div>

      {panel === 'account' && <AccountModal onClose={() => setPanel(null)} />}
      {panel === 'notifications' && <NotificationsModal onClose={() => setPanel(null)} />}
      {panel === 'logout' && (
        <ConfirmModal
          title="Se déconnecter"
          message="Voulez-vous vraiment vous déconnecter ?"
          confirmLabel="Se déconnecter"
          danger
          onConfirm={handleSignOut}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
