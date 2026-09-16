import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { formatSize, getStorageUsage, type StorageUsage } from '../lib/files-api';
import { signOut, useSession } from '../lib/auth-client';
import { IconFiles, IconLogout, IconStar, IconTrash, IconUsers, LogoMark } from './icons';

const NAV_ITEMS = [
  { to: '/explorer', label: 'Mes fichiers', icon: IconFiles },
  { to: '/suivis', label: 'Suivis', icon: IconStar },
  { to: '/corbeille', label: 'Corbeille', icon: IconTrash },
];
const ADMIN_NAV_ITEM = { to: '/admin/users', label: 'Administration', icon: IconUsers };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

export function AppLayout() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const navItems = session?.user.role === 'ADMIN' ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    getStorageUsage()
      .then(setStorageUsage)
      .catch(() => setStorageUsage(null));
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <LogoMark size={24} />
          Nimbus
        </div>
        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__spacer" />
        {storageUsage && (
          <div className="sidebar__storage">
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
        <div className="sidebar__footer">
          {session && (
            <div className="sidebar__account">
              <div className="sidebar__avatar">{getInitials(session.user.name)}</div>
              <span className="sidebar__user">{session.user.name}</span>
            </div>
          )}
          <button type="button" className="button button--secondary sidebar__logout" onClick={handleSignOut}>
            <IconLogout />
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
