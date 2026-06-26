import Link from "next/link";
import { X } from "lucide-react";
import { BracketView } from "@/components/bracket-view";
import { getBracketData } from "@/lib/espn-bracket";

export const revalidate = 300;

export default async function CrucesPage() {
  const bracket = await getBracketData();

  return (
    <div className="cruces-takeover">
      <div className="cruces-inner">
        <div className="cruces-hdr">
          <div className="cruces-hdr-top">
            <Link href="/matches" className="cruces-close" aria-label="Cerrar">
              <X size={18} strokeWidth={2.4} />
            </Link>
          </div>
          <p className="eyebrow">Camino al título</p>
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
