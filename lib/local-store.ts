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

function readKey(key: string) {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeKey(key: string) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
  }
}

function listKeys() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
}

function emit(name: string, detail: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
  }
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
  const raw = readKey(SESSION_KEY);
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
  writeKey(SESSION_KEY, JSON.stringify(session));
  emit(SESSION_EVENT, session);
}

export function clearStoredSession() {
  removeKey(SESSION_KEY);
  emit(SESSION_EVENT, null);
}

export function getStoredAllocation(scopeKey: string, matchId: string): StoredAllocationDraft | null {
  const raw =
    readKey(buildAllocationScopedKey(scopeKey, matchId)) ??
    (scopeKey !== "guest" ? readKey(buildAllocationScopedKey("guest", matchId)) : null) ??
    readKey(buildLegacyAllocationKey(matchId));
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
  const nextKey = buildAllocationScopedKey(scopeKey, matchId);
  writeKey(nextKey, JSON.stringify(draft));

  const guestKey = buildAllocationScopedKey("guest", matchId);
  if (guestKey !== nextKey) {
    removeKey(guestKey);
  }

  const legacyKey = buildLegacyAllocationKey(matchId);
  if (legacyKey !== nextKey) {
    removeKey(legacyKey);
  }

  emit(ALLOCATION_EVENT, { scopeKey, matchId, draft });
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
  const out = new Map<string, StoredAllocationDraft>();
  for (const key of listKeys()) {
    if (!key.startsWith(ALLOCATION_PREFIX)) continue;
    const scopedPrefix = `${ALLOCATION_PREFIX}${scopeKey}.`;
    const guestPrefix = `${ALLOCATION_PREFIX}guest.`;
    const isScopedKey = key.startsWith(scopedPrefix);
    const isGuestKey = scopeKey !== "guest" && key.startsWith(guestPrefix);
    const isLegacyKey = !key.slice(ALLOCATION_PREFIX.length).includes(".");
    if (!isScopedKey && !isGuestKey && !isLegacyKey) continue;
    const raw = readKey(key);
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
  const raw = readKey(`${CHAMPION_PREFIX}${scopeKey}`);
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
  writeKey(`${CHAMPION_PREFIX}${scopeKey}`, JSON.stringify(pick));
  emit(CHAMPION_EVENT, { scopeKey, pick });
}

const PENDING_CHAMPION_PICK_KEY = "mundial-pool.champion.__pending__";

export function getPendingChampionPick(): StoredChampionPick | null {
  const raw = readKey(PENDING_CHAMPION_PICK_KEY);
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
  writeKey(PENDING_CHAMPION_PICK_KEY, JSON.stringify(pick));
}

export function clearPendingChampionPick() {
  removeKey(PENDING_CHAMPION_PICK_KEY);
}
