import { isMarketEditable, MATCH_CREDIT, validateAllocations } from "@/lib/game";
import type { SaveTicketPayload } from "@/lib/domain";
import { getFallbackMatchById } from "@/lib/mock-data";
import { getCurrentSession } from "@/lib/server-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SaveTicketResult =
  | {
      ok: true;
      mode: "remote" | "local";
      message: string;
    }
  | {
      ok: false;
      reason: string;
    };

type MarketRow = {
  id: string;
  status: string;
  lock_at: string | null;
};

type OutcomeRow = {
  id: string;
  label: string;
};

export async function saveTicket(payload: SaveTicketPayload): Promise<SaveTicketResult> {
  const validation = validateAllocations(
    payload.allocations.map((allocation) => ({
      outcomeCode: allocation.label,
      amount: allocation.amount,
    })),
  );

  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reason ?? "Jugada invalida.",
    };
  }

  const match = getFallbackMatchById(payload.matchId);
  if (!match) {
    return {
      ok: false,
      reason: "Partido no encontrado.",
    };
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      ok: true,
      mode: "local",
      message: "Guardado en este dispositivo.",
    };
  }

  const session = await getCurrentSession();
  if (!session?.userId) {
    return {
      ok: false,
      reason: "No se encontro una sesion remota valida.",
    };
  }

  const marketQuery = await supabase
    .from("match_markets")
    .select("id, status, lock_at")
    .eq("match_id", payload.matchId)
    .maybeSingle<MarketRow>();

  if (marketQuery.error || !marketQuery.data) {
    return {
      ok: false,
      reason: "No se encontro el mercado del partido.",
    };
  }

  if (
    !isMarketEditable({
      status: marketQuery.data.status,
      lockAt: marketQuery.data.lock_at,
    })
  ) {
    return {
      ok: false,
      reason: "Este mercado ya cerro y no admite cambios.",
    };
  }

  const marketId = marketQuery.data.id;
  const outcomesQuery = await supabase
    .from("market_outcomes")
    .select("id, label")
    .eq("match_market_id", marketId)
    .returns<OutcomeRow[]>();

  if (outcomesQuery.error || !outcomesQuery.data) {
    return {
      ok: false,
      reason: "No se pudieron cargar los outcomes del partido.",
    };
  }

  const ticketUpsert = await supabase
    .from("tickets")
    .upsert(
      {
        user_id: session.userId,
        match_market_id: marketId,
        credit_total: MATCH_CREDIT,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,match_market_id" },
    )
    .select("id")
    .single<{ id: string }>();

  if (ticketUpsert.error) {
    return {
      ok: false,
      reason: "No se pudo guardar el ticket.",
    };
  }

  const ticketId = ticketUpsert.data.id;

  const allocationRows = payload.allocations
    .map((allocation) => {
      const outcome = outcomesQuery.data.find(
        (candidate) => normalizeLabel(candidate.label) === normalizeLabel(allocation.label),
      );

      if (!outcome) {
        return null;
      }

      return {
        ticket_id: ticketId,
        market_outcome_id: outcome.id,
        amount: allocation.amount,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (allocationRows.length !== payload.allocations.length) {
    return {
      ok: false,
      reason: "No coinciden las opciones de la jugada con las del mercado.",
    };
  }

  const deleteExisting = await supabase.from("ticket_allocations").delete().eq("ticket_id", ticketId);

  if (deleteExisting.error) {
    return {
      ok: false,
      reason: "No se pudo actualizar la jugada existente.",
    };
  }

  const insertAllocations = await supabase.from("ticket_allocations").insert(allocationRows);

  if (insertAllocations.error) {
    return {
      ok: false,
      reason: "No se pudieron guardar los montos de la jugada.",
    };
  }

  return {
    ok: true,
    mode: "remote",
    message: "Jugada guardada en backend.",
  };
}

function normalizeLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
