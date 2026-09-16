import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown } from './icons';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface PanelPosition {
  top: number;
  left: number;
  width: number;
}

export function Select({ id, value, options, onChange, disabled }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setPosition(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function isOutside(target: Node) {
      return (
        (!triggerRef.current || !triggerRef.current.contains(target)) &&
        (!panelRef.current || !panelRef.current.contains(target))
      );
    }

    function handlePointerDown(event: MouseEvent) {
      if (isOutside(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    function handleScroll() {
      setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  function handleOptionKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = options[Math.min(index + 1, options.length - 1)];
      onChange(next.value);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = options[Math.max(index - 1, 0)];
      onChange(prev.value);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selected?.label ?? value}</span>
        <IconChevronDown className={`select-trigger__chevron${isOpen ? ' select-trigger__chevron--open' : ''}`} />
      </button>
      {isOpen &&
        position &&
        createPortal(
          <ul
            ref={panelRef}
            className="select-panel"
            role="listbox"
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
          >
            {options.map((option, index) => (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`select-option${option.value === value ? ' select-option--active' : ''}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
