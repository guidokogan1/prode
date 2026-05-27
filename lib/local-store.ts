const SESSION_KEY = "mundial-pool.session";
const ALLOCATION_PREFIX = "mundial-pool.allocation.";
export const SESSION_EVENT = "mundial-pool:session-changed";
export const ALLOCATION_EVENT = "mundial-pool:allocation-changed";

export type StoredSession = {
  displayName: string;
  joinedAt: string;
};

export type StoredAllocation = {
  label: string;
  amount: number;
}[];

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

export function getStoredAllocation(matchId: string): StoredAllocation | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(`${ALLOCATION_PREFIX}${matchId}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAllocation;
  } catch {
    return null;
  }
}

export function saveStoredAllocation(matchId: string, allocations: StoredAllocation) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(`${ALLOCATION_PREFIX}${matchId}`, JSON.stringify(allocations));
  window.dispatchEvent(new CustomEvent(ALLOCATION_EVENT, { detail: { matchId, allocations } }));
}
