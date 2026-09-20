import type { ReactNode } from 'react';

interface RowNameProps {
  icon: ReactNode;
  name: string;
  // Ligne "taille · date" affichee sous le nom sur mobile uniquement (cf. styles/mobile.css) ;
  // sur desktop ces informations restent dans leurs colonnes de tableau.
  meta: string;
}

export function RowName({ icon, name, meta }: RowNameProps) {
  return (
    <>
      {icon}
      <span className="explorer-row__text">
        <span className="explorer-row__title">{name}</span>
        <span className="explorer-row__meta">{meta}</span>
      </span>
    </>
  );
}
