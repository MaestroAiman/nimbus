import { type ChangeEvent, type ReactNode, useEffect, useRef } from 'react';
import { IconCamera, IconFile, IconImage } from './icons';

interface UploadSourceSheetProps {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
}

interface Source {
  label: string;
  icon: ReactNode;
  accept?: string;
  capture?: 'environment';
}

const SOURCES: Source[] = [
  { label: 'Prendre une photo', icon: <IconCamera width={18} height={18} />, accept: 'image/*', capture: 'environment' },
  { label: 'Choisir dans la galerie', icon: <IconImage width={18} height={18} />, accept: 'image/*,video/*' },
  { label: 'Parcourir les fichiers', icon: <IconFile width={18} height={18} /> },
];

export function UploadSourceSheet({ onChange, onClose }: UploadSourceSheetProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Les <input> restent montes dans la feuille tant que le selecteur natif est ouvert :
  // la feuille ne se ferme qu'une fois le fichier choisi.
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event);
    onClose();
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal__title">Envoyer un fichier</h2>
        <div className="sheet-list">
          {SOURCES.map((source, index) => (
            <div key={source.label}>
              <input
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="file"
                hidden
                accept={source.accept}
                capture={source.capture}
                onChange={handleChange}
              />
              <button type="button" className="sheet-list__item" onClick={() => inputRefs.current[index]?.click()}>
                {source.icon}
                {source.label}
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="button button--secondary sheet-cancel" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
