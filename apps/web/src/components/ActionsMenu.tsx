import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
}

interface MenuPosition {
  top: number;
  right: number;
}

export function ActionsMenu({ actions, isOpen, onToggle, onClose, label = 'Actions' }: ActionsMenuProps) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !toggleRef.current) {
      setPosition(null);
      return;
    }
    const rect = toggleRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [isOpen]);

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

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose]);

  return (
    <div className="actions-menu">
      <button
        ref={toggleRef}
        type="button"
        className="actions-menu__toggle"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <IconMoreVertical />
      </button>
      {isOpen &&
        position &&
        createPortal(
          <ul
            ref={menuRef}
            className="actions-menu__list"
            role="menu"
            style={{ position: 'fixed', top: position.top, right: position.right }}
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
