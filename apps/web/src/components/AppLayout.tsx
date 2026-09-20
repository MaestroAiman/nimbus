import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { formatSize, getStorageUsage, type StorageUsage } from '../lib/files-api';
import { signOut, useSession } from '../lib/auth-client';
import { useIsMobile } from '../lib/use-media-query';
import { AccountModal } from './AccountModal';
import { ActionsMenu } from './ActionsMenu';
import { BottomNav } from './BottomNav';
import {
  IconFiles,
  IconLogout,
  IconPanelLeftClose,
  IconPanelLeftOpen,
  IconStar,
  IconTrash,
  IconUsers,
  LogoMark,
} from './icons';
import { NotificationsModal } from './NotificationsModal';

const NAV_ITEMS = [
  { to: '/explorer', label: 'Mes fichiers', icon: IconFiles },
  { to: '/suivis', label: 'Suivis', icon: IconStar },
  { to: '/corbeille', label: 'Corbeille', icon: IconTrash },
];
const ADMIN_NAV_ITEM = { to: '/admin/users', label: 'Administration', icon: IconUsers };

const COLLAPSE_STORAGE_KEY = 'nimbus:sidebar-collapsed';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

export function AppLayout() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const navItems = session?.user.role === 'ADMIN' ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'account' | 'notifications' | null>(null);

  useEffect(() => {
    getStorageUsage()
      .then(setStorageUsage)
      .catch(() => setStorageUsage(null));
  }, []);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const sidebar = (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <LogoMark size={collapsed ? 36 : 75} />
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
          >
            <item.icon />
            <span className="sidebar__link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__spacer" />
      {storageUsage && !collapsed && (
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
      <button
        type="button"
        className="sidebar__collapse-toggle"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
        title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
      >
        {collapsed ? <IconPanelLeftOpen /> : <IconPanelLeftClose />}
        <span className="sidebar__link-label">Réduire le menu</span>
      </button>
      <div className="sidebar__footer">
        {session && (
          <div className="sidebar__account">
            <ActionsMenu
              actions={[
                { label: 'Mon compte', onClick: () => setActiveModal('account') },
                { label: 'Notifications', onClick: () => setActiveModal('notifications') },
              ]}
              isOpen={isAccountMenuOpen}
              onToggle={() => setIsAccountMenuOpen((value) => !value)}
              onClose={() => setIsAccountMenuOpen(false)}
              label="Menu du compte"
              triggerContent={getInitials(session.user.name)}
              triggerClassName="sidebar__avatar"
            />
            <span className="sidebar__user">{session.user.name}</span>
            <button
              type="button"
              className="sidebar__logout-icon"
              onClick={handleSignOut}
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <IconLogout />
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {!isMobile && sidebar}
      <main className="app-main">
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
      {activeModal === 'account' && <AccountModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'notifications' && <NotificationsModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}
