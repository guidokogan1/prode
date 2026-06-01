import type {
  HistoryEntry,
  HomeSummary,
  MatchStageGroup,
  MatchViewModel,
  ProductProvider,
  ProfileViewModel,
  RankingEntry,
  SaveTicketPayload,
  SaveTicketResult,
  SessionState,
} from "@/lib/domain";
import { validateAllocations } from "@/lib/game";
import {
  getFallbackHistory,
  getFallbackHomeSummary,
  getFallbackMatchById,
  getFallbackMatches,
  getFallbackMatchesByStage,
  getFallbackProfile,
  getFallbackRanking,
} from "@/lib/mock-data";
import { getServerSessionState } from "@/lib/product/session-state";

export class DemoProductProvider implements ProductProvider {
  mode = "demo" as const;

  async getSessionState(): Promise<SessionState> {
    return getServerSessionState(this.mode);
  }

  async getHomeSummary(): Promise<HomeSummary> {
    const session = await this.getSessionState();
    return getFallbackHomeSummary(session.demoPersonaSlug);
  }

  async getMatchesForHome(): Promise<MatchViewModel[]> {
    const session = await this.getSessionState();
    const matches = getFallbackMatches(session.demoPersonaSlug);
    return matches.slice().sort(sortMatchesForHome).slice(0, 5);
  }

  async listMatches(): Promise<MatchViewModel[]> {
    const session = await this.getSessionState();
    return getFallbackMatches(session.demoPersonaSlug);
  }

  async listMatchesByStage(): Promise<MatchStageGroup[]> {
    const session = await this.getSessionState();
    return getFallbackMatchesByStage(session.demoPersonaSlug);
  }

  async getMatchDetail(id: string): Promise<MatchViewModel | null> {
    const session = await this.getSessionState();
    return getFallbackMatchById(id, session.demoPersonaSlug) ?? null;
  }

  async getRanking(): Promise<RankingEntry[]> {
    return getFallbackRanking();
  }

  async getProfile(): Promise<ProfileViewModel> {
    const session = await this.getSessionState();
    const profile = getFallbackProfile(session.demoPersonaSlug);

    return {
      ...profile,
      isCurrentUser: true,
      name: session.displayName ?? profile.name,
    };
  }

  async getHistory(): Promise<HistoryEntry[]> {
    const session = await this.getSessionState();
    return getFallbackHistory(session.demoPersonaSlug);
  }

  async submitTicket(payload: SaveTicketPayload): Promise<SaveTicketResult> {
    const validation = validateAllocations(
      payload.allocations.map((allocation) => ({
        outcomeCode: allocation.label,
        amount: allocation.amount,
      })),
    );

    if (!validation.ok) {
      return {
        ok: false,
        state: "sync_error",
        reason: validation.reason ?? "Jugada inválida.",
      };
    }

    const session = await this.getSessionState();
    const match = getFallbackMatchById(payload.matchId, session.demoPersonaSlug);
    if (!match) {
      return {
        ok: false,
        state: "sync_error",
        reason: "Partido no encontrado.",
      };
    }

    return {
      ok: true,
      mode: "local",
      state: "saved_local",
      message: "Borrador guardado en este dispositivo.",
    };
  }
}

function sortMatchesForHome(left: MatchViewModel, right: MatchViewModel) {
  const score = (match: MatchViewModel) => {
    if (match.statusVariant === "live") {
      return 0;
    }

    if (match.isEditable) {
      return 1;
    }

    if (match.statusVariant === "locked") {
      return 2;
    }

    return 3;
  };

  return score(left) - score(right);
}
