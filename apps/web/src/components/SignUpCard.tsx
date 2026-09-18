import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Clock, Mail, User, ArrowRight } from 'lucide-react';
import { PasswordInput } from './PasswordInput';
import { signUp } from '../lib/auth-client';

type FocusedField = 'name' | 'email' | 'password' | null;
type Status = 'form' | 'pending';

export function SignUpCard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState<FocusedField>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>('form');

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left - rect.width / 2);
    mouseY.set(event.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signUpError } = await signUp.email({ name, email, password });

    setIsSubmitting(false);

    if (signUpError) {
      if (signUpError.code === 'BANNED_USER') {
        // Chemin nominal pour une nouvelle auto-inscription : le compte est cree mais bloque
        // en attente de validation admin (voir apps/api/src/auth/auth.ts) - ce n'est pas une
        // vraie erreur, juste la connexion automatique qui echoue comme prevu.
        setStatus('pending');
        return;
      }
      setError(signUpError.message ?? 'Impossible de creer le compte');
      return;
    }

    // Rechargement complet plutot qu'un navigate() client-side : voir le commentaire
    // equivalent dans LoginPage.tsx (course avec la mise a jour asynchrone du store de
    // session partage par Better Auth).
    window.location.assign('/explorer');
  }

  return (
    <div className="auth-glass-showcase">
      <div className="auth-glass-showcase__backdrop" />
      <div className="auth-glass-showcase__noise" />

      <div className="auth-glass-showcase__glow-top" />
      <motion.div
        className="auth-glass-showcase__glow-top-pulse"
        animate={{ opacity: [0.15, 0.3, 0.15], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'mirror' }}
      />
      <motion.div
        className="auth-glass-showcase__glow-bottom-pulse"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror', delay: 1 }}
      />

      <div className="auth-glass-showcase__spot auth-glass-showcase__spot--left" />
      <div className="auth-glass-showcase__spot auth-glass-showcase__spot--right" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="auth-glass-card-wrap"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="auth-glass-card"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 10 }}
        >
          <motion.div
            className="auth-glass-card__glow"
            animate={{
              boxShadow: [
                '0 0 10px 2px rgba(255,255,255,0.03)',
                '0 0 15px 5px rgba(255,255,255,0.05)',
                '0 0 10px 2px rgba(255,255,255,0.03)',
              ],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }}
          />

          <div className="auth-glass-card__beams">
            <motion.div
              className="auth-glass-card__beam auth-glass-card__beam--top"
              animate={{ left: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
              transition={{
                left: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 },
                opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror' },
              }}
            />
            <motion.div
              className="auth-glass-card__beam auth-glass-card__beam--right"
              animate={{ top: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
              transition={{
                top: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 0.6 },
                opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 0.6 },
              }}
            />
            <motion.div
              className="auth-glass-card__beam auth-glass-card__beam--bottom"
              animate={{ right: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
              transition={{
                right: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.2 },
                opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.2 },
              }}
            />
            <motion.div
              className="auth-glass-card__beam auth-glass-card__beam--left"
              animate={{ bottom: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
              transition={{
                bottom: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.8 },
                opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.8 },
              }}
            />
            <div className="auth-glass-card__corner auth-glass-card__corner--tl" />
            <div className="auth-glass-card__corner auth-glass-card__corner--tr" />
            <div className="auth-glass-card__corner auth-glass-card__corner--br" />
            <div className="auth-glass-card__corner auth-glass-card__corner--bl" />
          </div>

          <div className="auth-glass-card__border" />

          <div className="auth-glass-card__glass">
            <div className="auth-glass-card__pattern" />

            {status === 'pending' ? (
              <div className="auth-glass-card__header">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', duration: 0.8 }}
                  className="auth-glass-card__logo auth-glass-card__logo--pending"
                >
                  <Clock size={20} />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="auth-glass-card__title"
                >
                  Inscription bien reçue
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="auth-glass-card__subtitle"
                >
                  Votre compte a été créé. Un administrateur doit valider votre inscription avant que vous puissiez vous
                  connecter.
                </motion.p>

                <motion.p
                  className="auth-glass-card__footer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{ marginTop: 'var(--space-lg, 24px)' }}
                >
                  <Link to="/login">Retour à la connexion</Link>
                </motion.p>
              </div>
            ) : (
              <>
                <div className="auth-glass-card__header">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', duration: 0.8 }}
                    className="auth-glass-card__logo"
                  >
                    <img src="/logo.png" alt="Nimbus" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                    <div className="auth-glass-card__logo-glow" />
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="auth-glass-card__title"
                  >
                    Créer votre espace
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="auth-glass-card__subtitle"
                  >
                    Votre stockage personnel, chez vous.
                  </motion.p>
                </div>

                <form onSubmit={handleSubmit} className="auth-glass-card__form">
              <div className="auth-glass-card__fields">
                <motion.div
                  className="auth-glass-field"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="auth-glass-field__wrap">
                    <User
                      className={`auth-glass-field__icon${focusedInput === 'name' ? ' auth-glass-field__icon--focused' : ''}`}
                    />
                    <input
                      type="text"
                      placeholder="Votre nom"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onFocus={() => setFocusedInput('name')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </div>
                </motion.div>

                <motion.div
                  className="auth-glass-field"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="auth-glass-field__wrap">
                    <Mail
                      className={`auth-glass-field__icon${focusedInput === 'email' ? ' auth-glass-field__icon--focused' : ''}`}
                    />
                    <input
                      type="email"
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </div>
                </motion.div>

                <motion.div
                  className="auth-glass-field"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="auth-glass-field__wrap">
                    <PasswordInput
                      placeholder="8 caractères minimum"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </div>
                </motion.div>
              </div>

              {error && <p className="auth-glass-card__error">{error}</p>}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="auth-glass-card__submit"
              >
                <div className="auth-glass-card__submit-glow" />
                <div className="auth-glass-card__submit-inner">
                  <AnimatePresence mode="wait">
                    {isSubmitting ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="auth-glass-card__spinner" />
                      </motion.div>
                    ) : (
                      <motion.span
                        key="button-text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        Créer mon compte
                        <ArrowRight className="auth-glass-card__submit-icon" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>

              <motion.p
                className="auth-glass-card__footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Déjà un compte ? <Link to="/login">Se connecter</Link>
              </motion.p>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
