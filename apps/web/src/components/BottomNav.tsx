import { NavLink, useLocation } from 'react-router-dom';
import { IconFiles, IconStar, IconTrash, IconUser } from './icons';

const TABS = [
  { to: '/explorer', label: 'Fichiers', icon: IconFiles },
  { to: '/suivis', label: 'Suivis', icon: IconStar },
  { to: '/corbeille', label: 'Corbeille', icon: IconTrash },
  { to: '/compte', label: 'Compte', icon: IconUser },
];

export function BottomNav() {
  const { pathname } = useLocation();
  // L'administration est un sous-ecran du Compte : l'onglet reste actif.
  const isAccountArea = pathname.startsWith('/compte') || pathname.startsWith('/admin');

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => {
            const active = tab.to === '/compte' ? isAccountArea : isActive;
            return `bottom-nav__tab${active ? ' bottom-nav__tab--active' : ''}`;
          }}
        >
          <tab.icon width={20} height={20} />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
