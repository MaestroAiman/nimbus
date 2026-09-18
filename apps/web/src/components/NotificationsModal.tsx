import { useEffect, useState } from 'react';
import { type ActivityEvent, describeActivity, listActivity } from '../lib/activity-api';
import { formatDateTime } from '../lib/files-api';
import { IconClose } from './icons';

interface NotificationsModalProps {
  onClose: () => void;
}

export function NotificationsModal({ onClose }: NotificationsModalProps) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    listActivity()
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les notifications'));
  }, []);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--preview" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Notifications</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <IconClose />
          </button>
        </div>

        {error && <p className="explorer__error">{error}</p>}

        {!error && !events && <p className="explorer__empty-subtitle">Chargement…</p>}

        {!error && events && events.length === 0 && (
          <p className="explorer__empty-subtitle">Aucune activité pour le moment.</p>
        )}

        {!error && events && events.length > 0 && (
          <ul className="activity-list">
            {events.map((event) => (
              <li key={event.id} className="activity-list__item">
                <span className="activity-list__text">
                  <strong>{event.actorName}</strong> {describeActivity(event)}
                </span>
                <span className="activity-list__date">{formatDateTime(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
