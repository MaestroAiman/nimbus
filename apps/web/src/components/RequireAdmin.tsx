import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../lib/auth-client';

export function RequireAdmin() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="auth-page">Chargement…</div>;
  }

  if (!session || session.user.role !== 'ADMIN') {
    return <Navigate to="/explorer" replace />;
  }

  return <Outlet />;
}
