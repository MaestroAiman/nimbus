import { type FormEvent, useEffect, useState } from 'react';

interface NameSheetProps {
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

export function NameSheet({ title, placeholder, initialValue = '', submitLabel, onSubmit, onClose }: NameSheetProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = value.trim();
    if (!name) return;
    onSubmit(name);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal__title">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <input
              type="text"
              autoFocus
              aria-label={title}
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="button button--secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="button">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
