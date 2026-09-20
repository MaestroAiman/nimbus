/**
 * En-tete Content-Disposition `attachment` : `filename*` (RFC 5987) porte le nom UTF-8 exact,
 * `filename` n'est qu'un repli ASCII pour les vieux clients (sans guillemets ni controle).
 */
export function buildContentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]|["\\%]/g, '_');
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
