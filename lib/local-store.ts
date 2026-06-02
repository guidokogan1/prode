import type { DraftSyncState, SessionKind } from "@/lib/domain";

const SESSION_KEY = "mundial-pool.session";
const ALLOCATION_PREFIX = "mundial-pool.allocation.";
const CHAMPION_PREFIX = "mundial-pool.champion.";
export const SESSION_EVENT = "mundial-pool:session-changed";
export const ALLOCATION_EVENT = "mundial-pool:allocation-changed";
export const CHAMPION_EVENT = "mundial-pool:champion-changed";

export type StoredSession = {
  displayName: string;
  joinedAt: string;
  kind: Extract<SessionKind, "local">;
};

export type StoredAllocation = {
  label: string;
  amount: number;
};

export type StoredAllocationDraft = {
  status: DraftSyncState;
  savedAt: string;
  allocations: StoredAllocation[];
};

export type StoredChampionPick = {
  teamName: string;
  savedAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getStoredSession(): StoredSession | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredSession) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
}

export function clearStoredSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: null }));
}

export function getStoredAllocation(matchId: string): StoredAllocationDraft | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(`${ALLOCATION_PREFIX}${matchId}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAllocationDraft;
  } catch {
    return null;
  }
}

export function saveStoredAllocation(matchId: string, draft: StoredAllocationDraft) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(`${ALLOCATION_PREFIX}${matchId}`, JSON.stringify(draft));
  window.dispatchEvent(new CustomEvent(ALLOCATION_EVENT, { detail: { matchId, draft } }));
}

export function getStoredChampionPick(scopeKey: string): StoredChampionPick | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(`${CHAMPION_PREFIX}${scopeKey}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredChampionPick;
  } catch {
    return null;
  }
}

export function saveStoredChampionPick(scopeKey: string, pick: StoredChampionPick) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(`${CHAMPION_PREFIX}${scopeKey}`, JSON.stringify(pick));
  window.dispatchEvent(new CustomEvent(CHAMPION_EVENT, { detail: { scopeKey, pick } }));
}
