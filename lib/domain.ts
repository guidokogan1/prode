export type MatchStatus = "scheduled" | "live" | "finished";
export type MarketType = "1x2" | "qualifies";

export type MatchViewModel = {
  id: string;
  stage: string;
  venue: string;
  kickoffLabel: string;
  status: MatchStatus;
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
  allocation: {
    label: string;
    amount: string;
    percentage: number;
  }[];
  consensus: {
    label: string;
    percentage: number;
  }[];
  form: {
    home: string;
    away: string;
    homeGoals: string;
    awayGoals: string;
  };
  revealedTickets: {
    userName: string;
    allocations: {
      label: string;
      amount: string;
    }[];
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
  label: string;
  amount: number;
};

export type SaveTicketPayload = {
  matchId: string;
  allocations: AllocationDraft[];
  displayName: string;
};
