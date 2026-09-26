// Symbol einer Seite: eigenes Symbol geht vor, sonst eines je Art.
// Bewusst nichts in der Datenbank – so passt das Symbol auch zu Seiten,
// die vor der Leinwand angelegt wurden (#211).

const FALLBACK: Record<string, string> = {
  BOARD: "🎨",
  WEB: "🌐",
  HTML: "💻",
};

export function docIcon(doc: { icon: string | null; kind: string }): string {
  return doc.icon || FALLBACK[doc.kind] || "📄";
}
