export type MatchStatus = "scheduled" | "live" | "finished";
export type MarketStatus = "open" | "locked" | "revealed" | "settled";
export type MarketType = "1x2" | "qualifies";
export type MatchStatusVariant = "upcoming" | "locked" | "live" | "revealed" | "settled";
export type MatchOutcomeCode = "home" | "draw" | "away" | "home_qualifies" | "away_qualifies";
export type AppMode = "demo" | "supabase";
export type SessionKind = "anonymous" | "demo" | "local" | "remote";
export type DraftSyncState = "idle" | "draft" | "saved_local" | "saved_remote" | "sync_error";

export type SessionState = {
  kind: SessionKind;
  appMode: AppMode;
  displayName: string | null;
  userId?: string;
  demoPersonaSlug?: string;
};

export type OutcomeViewModel = {
  code: MatchOutcomeCode;
  label: string;
  shortLabel: string;
  amount: number;
  percentage: number;
};

export type RevealedTicketViewModel = {
  userName: string;
  allocations: Pick<OutcomeViewModel, "code" | "label" | "shortLabel" | "amount">[];
  netAmount?: number;
};

export type MatchViewModel = {
  id: string;
  stage: string;
  venue: string;
  kickoffLabel: string;
  status: MatchStatus;
  marketStatus: MarketStatus;
  statusVariant: MatchStatusVariant;
  statusLabel: string;
  marketType: MarketType;
  marketTypeLabel: string;
  userStateLabel: string;
  draftState: DraftSyncState;
  isEditable: boolean;
  home: {
    name: string;
    flag: string;
    score: number;
  };
  away: {
    name: string;
    flag: string;
    score: number;
  };
  allocation: OutcomeViewModel[];
  consensus: Omit<OutcomeViewModel, "amount">[];
  form: {
    home: string;
    away: string;
    homeGoals: number;
    awayGoals: number;
  };
  revealedTickets: RevealedTicketViewModel[];
};

export type RankingEntry = {
  position: number;
  name: string;
  netAmount: number;
  positiveTickets: number;
  bestHitAmount: number;
  isCurrentUser?: boolean;
};

export type HistoryEntry = {
  id: string;
  title: string;
  stage: string;
  description: string;
  netAmount: number;
  allocations: {
    label: string;
    amount: number;
  }[];
};

export type ProfileViewModel = {
  name: string;
  netAmount: number;
  positiveTickets: number;
  bestHitAmount: number;
  championPick: string;
  isCurrentUser?: boolean;
};

export type HomeSummary = {
  liveMatches: number;
  pendingPicks: number;
  settledToday: number;
  yourNetAmount: number;
};

export type MatchStageGroup = {
  stage: string;
  label: string;
  matches: MatchViewModel[];
};

export type AllocationDraft = {
  code?: MatchOutcomeCode;
  label: string;
  amount: number;
};

export type SaveTicketPayload = {
  matchId: string;
  allocations: AllocationDraft[];
  displayName?: string;
};

export type SaveTicketResult =
  | {
      ok: true;
      mode: "local" | "remote";
      state: DraftSyncState;
      message: string;
    }
  | {
      ok: false;
      state: "sync_error";
      reason: string;
    };

export type ProductProvider = {
  mode: AppMode;
  getSessionState(): Promise<SessionState>;
  getHomeSummary(): Promise<HomeSummary>;
  getMatchesForHome(): Promise<MatchViewModel[]>;
  listMatches(): Promise<MatchViewModel[]>;
  listMatchesByStage(): Promise<MatchStageGroup[]>;
  getMatchDetail(id: string): Promise<MatchViewModel | null>;
  getRanking(): Promise<RankingEntry[]>;
  getProfile(): Promise<ProfileViewModel>;
  getHistory(): Promise<HistoryEntry[]>;
  submitTicket(payload: SaveTicketPayload): Promise<SaveTicketResult>;
};
