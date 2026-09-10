import { Link } from 'react-router-dom';

export function RegisterPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Créer un compte</h1>
        <form onSubmit={(event) => event.preventDefault()}>
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
            <input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <button type="submit" className="button">
            Créer mon compte
          </button>
        </form>
        <p className="auth-card__footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
