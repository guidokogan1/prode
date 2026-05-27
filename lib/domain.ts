export type MatchStatus = "scheduled" | "live" | "finished";
export type MarketType = "1x2" | "qualifies";
export type MatchStatusVariant = "upcoming" | "locked" | "live" | "revealed" | "settled";
export type MatchOutcomeCode = "home" | "draw" | "away" | "home_qualifies" | "away_qualifies";

export type OutcomeViewModel = {
  code: MatchOutcomeCode;
  label: string;
  shortLabel: string;
  amount: string;
  percentage: number;
};

export type MatchViewModel = {
  id: string;
  stage: string;
  venue: string;
  kickoffLabel: string;
  status: MatchStatus;
  statusVariant: MatchStatusVariant;
  statusLabel: string;
  marketType: MarketType;
  marketTypeLabel: string;
  userStateLabel: string;
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
    homeGoals: string;
    awayGoals: string;
  };
  revealedTickets: {
    userName: string;
    allocations: Pick<OutcomeViewModel, "code" | "label" | "shortLabel" | "amount">[];
    netLabel?: string;
  }[];
};

export type RankingEntry = {
  position: number;
  name: string;
  net: number;
  netLabel: string;
  positiveTickets: number;
  bestHit: string;
};

export type HistoryEntry = {
  id: string;
  title: string;
  stage: string;
  description: string;
  net: number;
  netLabel: string;
  allocations: {
    label: string;
    amount: string;
  }[];
};

export type ProfileViewModel = {
  name: string;
  netLabel: string;
  positiveTickets: number;
  bestHit: string;
  championPick: string;
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
