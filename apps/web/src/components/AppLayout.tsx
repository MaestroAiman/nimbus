import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut, useSession } from '../lib/auth-client';

const NAV_ITEMS = [{ to: '/explorer', label: 'Mes fichiers' }];

export function AppLayout() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">Nimbus</div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          {session && <p className="sidebar__user">{session.user.name}</p>}
          <button type="button" className="button button--secondary" onClick={handleSignOut}>
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
