import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from '../lib/auth-client';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));

    const { error: signInError } = await signIn.email({ email, password });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message ?? 'Identifiants invalides');
      return;
    }

    navigate('/explorer', { replace: true });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Connexion</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="auth-card__footer">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
