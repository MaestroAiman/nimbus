import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../lib/auth-client';

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name'));
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));

    const { error: signUpError } = await signUp.email({ name, email, password });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message ?? "Impossible de creer le compte");
      return;
    }

    navigate('/explorer', { replace: true });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Créer un compte</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Nom</label>
            <input id="name" name="name" type="text" autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
        <p className="auth-card__footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
