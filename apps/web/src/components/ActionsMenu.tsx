import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '../lib/use-media-query';
import { IconMoreVertical } from './icons';

export interface MenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ActionsMenuProps {
  actions: MenuAction[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  label?: string;
  // Titre de la feuille d'actions affichee sur mobile (nom du fichier, du dossier, de l'utilisateur).
  title?: string;
  triggerContent?: ReactNode;
  triggerClassName?: string;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

const ESTIMATED_MENU_WIDTH = 200;
const ESTIMATED_MENU_HEIGHT = 200;

export function ActionsMenu({
  actions,
  isOpen,
  onToggle,
  onClose,
  label = 'Actions',
  title,
  triggerContent,
  triggerClassName = 'actions-menu__toggle',
}: ActionsMenuProps) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const isMobile = useIsMobile();

  useLayoutEffect(() => {
    if (!isOpen || isMobile || !toggleRef.current) {
      setPosition(null);
      return;
    }
    const rect = toggleRef.current.getBoundingClientRect();
    const openUpward = rect.bottom + ESTIMATED_MENU_HEIGHT > window.innerHeight;
    const alignLeft = rect.left + ESTIMATED_MENU_WIDTH <= window.innerWidth;

    setPosition({
      ...(openUpward ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      ...(alignLeft ? { left: rect.left } : { right: window.innerWidth - rect.right }),
    });
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (!isOpen) return;

    function isOutside(target: Node) {
      return (
        (!toggleRef.current || !toggleRef.current.contains(target)) &&
        (!menuRef.current || !menuRef.current.contains(target))
      );
    }

    function handlePointerDown(event: MouseEvent) {
      if (isOutside(event.target as Node)) onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    function handleScroll() {
      onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    // La feuille mobile a son propre fond cliquable et defile en interne : pas de fermeture au scroll.
    if (!isMobile) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, isMobile, onClose]);

  return (
    <div className="actions-menu">
      <button
        ref={toggleRef}
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        {triggerContent ?? <IconMoreVertical />}
      </button>
      {isOpen &&
        isMobile &&
        createPortal(
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title ?? label} onClick={onClose}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              {title && <h2 className="modal__title">{title}</h2>}
              <div className="sheet-list">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className={`sheet-list__item${action.danger ? ' sheet-list__item--danger' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      action.onClick();
                      onClose();
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <button type="button" className="button button--secondary sheet-cancel" onClick={onClose}>
                Annuler
              </button>
            </div>
          </div>,
          document.body,
        )}
      {isOpen &&
        !isMobile &&
        position &&
        createPortal(
          <ul
            ref={menuRef}
            className="actions-menu__list"
            role="menu"
            style={{ position: 'fixed', ...position }}
          >
            {actions.map((action) => (
              <li key={action.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`actions-menu__item${action.danger ? ' actions-menu__item--danger' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    action.onClick();
                    onClose();
                  }}
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
