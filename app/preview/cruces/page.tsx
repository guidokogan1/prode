import { BracketView } from "@/components/bracket-view";
import { getBracketData } from "@/lib/espn-bracket";

export const revalidate = 300;

export default async function PreviewCrucesPage() {
  const bracket = await getBracketData();

  return (
    <div className="cruces-takeover">
      <div className="cruces-inner">
        <div className="cruces-hdr">
          <p className="eyebrow">Preview · Torneo Clausura 2026</p>
          <h1 className="cruces-title">Cruces</h1>
        </div>

        {bracket.available ? (
          <BracketView data={bracket} />
        ) : (
          <p className="muted-copy" style={{ padding: "0 16px" }}>
            No se pudieron cargar las posiciones en este momento. Probá de nuevo en un rato.
          </p>
        )}
      </div>
    </div>
  );
}
