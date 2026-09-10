import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { ExplorerPage } from './pages/ExplorerPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/explorer" replace />} />
            <Route path="/explorer" element={<ExplorerPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
