import { type InputHTMLAttributes, useState } from 'react';
import { IconEye, IconEyeOff } from './icons';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field__input-wrap">
      <input type={visible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="field__toggle"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        tabIndex={-1}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
