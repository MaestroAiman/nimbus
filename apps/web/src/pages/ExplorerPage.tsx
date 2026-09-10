const MOCK_ENTRIES = [
  { id: '1', type: 'folder' as const, name: 'Documents', size: '—', updatedAt: '10/09/2026' },
  { id: '2', type: 'folder' as const, name: 'Photos', size: '—', updatedAt: '08/09/2026' },
  { id: '3', type: 'file' as const, name: 'rapport.pdf', size: '2.4 Mo', updatedAt: '09/09/2026' },
  { id: '4', type: 'file' as const, name: 'facture.png', size: '340 Ko', updatedAt: '07/09/2026' },
];

export function ExplorerPage() {
  return (
    <div>
      <div className="explorer__header">
        <div>
          <h1>Mes fichiers</h1>
          <div className="explorer__breadcrumb">Racine</div>
        </div>
        <button type="button" className="button">
          Nouveau dossier
        </button>
      </div>
      <table className="explorer-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Taille</th>
            <th>Modifié le</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_ENTRIES.map((entry) => (
            <tr key={entry.id}>
              <td>
                <span className="explorer-row__name">
                  <span className="explorer-row__icon">{entry.type === 'folder' ? '📁' : '📄'}</span>
                  {entry.name}
                </span>
              </td>
              <td>{entry.size}</td>
              <td>{entry.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
