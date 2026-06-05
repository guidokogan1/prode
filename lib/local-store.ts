import type { DraftSyncState, MatchOutcomeCode, SessionKind, SessionState } from "@/lib/domain";

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
  code?: MatchOutcomeCode;
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

function buildAllocationScopedKey(scopeKey: string, matchId: string) {
  return `${ALLOCATION_PREFIX}${scopeKey}.${matchId}`;
}

function buildLegacyAllocationKey(matchId: string) {
  return `${ALLOCATION_PREFIX}${matchId}`;
}

export function buildAllocationScope(session: SessionState | null) {
  if (session?.kind === "remote" && session.userId) {
    return `remote:${session.userId}`;
  }

  if (session?.kind === "demo") {
    return `demo:${session.demoPersonaSlug ?? "default"}`;
  }

  if (session?.kind === "local") {
    return `local:${session.displayName ?? "guest"}`;
  }

  return "guest";
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

export function getStoredAllocation(scopeKey: string, matchId: string): StoredAllocationDraft | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw =
    window.localStorage.getItem(buildAllocationScopedKey(scopeKey, matchId)) ??
    (scopeKey !== "guest" ? window.localStorage.getItem(buildAllocationScopedKey("guest", matchId)) : null) ??
    window.localStorage.getItem(buildLegacyAllocationKey(matchId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAllocationDraft;
  } catch {
    return null;
  }
}

export function saveStoredAllocation(scopeKey: string, matchId: string, draft: StoredAllocationDraft) {
  if (!canUseStorage()) {
    return;
  }

  const nextKey = buildAllocationScopedKey(scopeKey, matchId);
  window.localStorage.setItem(nextKey, JSON.stringify(draft));
  const guestKey = buildAllocationScopedKey("guest", matchId);
  if (guestKey !== nextKey) {
    window.localStorage.removeItem(guestKey);
  }
  const legacyKey = buildLegacyAllocationKey(matchId);
  if (legacyKey !== nextKey) {
    window.localStorage.removeItem(legacyKey);
  }
  window.dispatchEvent(new CustomEvent(ALLOCATION_EVENT, { detail: { scopeKey, matchId, draft } }));
}

export function listSyncErrorAllocations(scopeKey: string): { matchId: string; draft: StoredAllocationDraft }[] {
  return listAllocationsForScope(scopeKey, (draft) => draft.status === "sync_error");
}

export function listAllStoredAllocations(scopeKey: string): { matchId: string; draft: StoredAllocationDraft }[] {
  return listAllocationsForScope(scopeKey, (draft) => {
    const sum = (draft.allocations ?? []).reduce((a, b) => a + (b.amount ?? 0), 0);
    return sum > 0;
  });
}

function listAllocationsForScope(
  scopeKey: string,
  predicate: (draft: StoredAllocationDraft) => boolean,
): { matchId: string; draft: StoredAllocationDraft }[] {
  if (!canUseStorage()) {
    return [];
  }
  const out = new Map<string, StoredAllocationDraft>();
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(ALLOCATION_PREFIX)) continue;
    const scopedPrefix = `${ALLOCATION_PREFIX}${scopeKey}.`;
    const guestPrefix = `${ALLOCATION_PREFIX}guest.`;
    const isScopedKey = key.startsWith(scopedPrefix);
    const isGuestKey = scopeKey !== "guest" && key.startsWith(guestPrefix);
    const isLegacyKey = !key.slice(ALLOCATION_PREFIX.length).includes(".");
    if (!isScopedKey && !isGuestKey && !isLegacyKey) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const draft = JSON.parse(raw) as StoredAllocationDraft;
      if (predicate(draft)) {
        const matchId = isScopedKey
          ? key.slice(scopedPrefix.length)
          : isGuestKey
            ? key.slice(guestPrefix.length)
            : key.slice(ALLOCATION_PREFIX.length);
        if (!out.has(matchId) || isScopedKey) {
          out.set(matchId, draft);
        }
      }
    } catch {
      continue;
    }
  }
  return Array.from(out.entries()).map(([matchId, draft]) => ({ matchId, draft }));
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

const PENDING_CHAMPION_PICK_KEY = "mundial-pool.champion.__pending__";

export function getPendingChampionPick(): StoredChampionPick | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_CHAMPION_PICK_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredChampionPick;
  } catch {
    return null;
  }
}

export function setPendingChampionPick(pick: StoredChampionPick) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PENDING_CHAMPION_PICK_KEY, JSON.stringify(pick));
}

export function clearPendingChampionPick() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(PENDING_CHAMPION_PICK_KEY);
}
