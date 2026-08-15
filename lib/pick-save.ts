import { listSyncErrorAllocations, saveStoredAllocation, type StoredAllocation } from "@/lib/local-store";

export type PickSaveResult = {
  confirmed: boolean;
  reason?: string;
};

const REQUEST_TIMEOUT_MS = 9000;
const RETRY_DELAYS_MS = [500, 1500];
const RETRY_CONCURRENCY = 4;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readReason(response: Response) {
  try {
    const body = (await response.json()) as { reason?: string };
    return typeof body.reason === "string" ? body.reason : undefined;
  } catch {
    return undefined;
  }
}

async function postTicket(matchId: string, allocations: StoredAllocation[]) {
  try {
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, allocations }),
      credentials: "include",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.ok) {
      return { confirmed: true, retryable: false };
    }

    return {
      confirmed: false,
      retryable: response.status >= 500 || response.status === 429,
      reason: await readReason(response),
    };
  } catch {
    return { confirmed: false, retryable: true, reason: "Sin conexión" };
  }
}

export async function savePick(
  scopeKey: string,
  matchId: string,
  allocations: StoredAllocation[],
  { withRetries = false }: { withRetries?: boolean } = {},
): Promise<PickSaveResult> {
  saveStoredAllocation(scopeKey, matchId, {
    allocations,
    savedAt: new Date().toISOString(),
    status: "draft",
  });

  const delays = withRetries ? RETRY_DELAYS_MS : [];
  let reason: string | undefined;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    if (attempt > 0) {
      await wait(delays[attempt - 1]);
    }

    const outcome = await postTicket(matchId, allocations);

    if (outcome.confirmed) {
      saveStoredAllocation(scopeKey, matchId, {
        allocations,
        savedAt: new Date().toISOString(),
        status: "saved_remote",
      });
      return { confirmed: true };
    }

    reason = outcome.reason ?? reason;

    if (!outcome.retryable) {
      break;
    }
  }

  saveStoredAllocation(scopeKey, matchId, {
    allocations,
    savedAt: new Date().toISOString(),
    status: "sync_error",
  });

  return { confirmed: false, reason };
}

export function countUnconfirmedPicks(scopeKey: string) {
  return listSyncErrorAllocations(scopeKey).length;
}

export async function retryUnconfirmedPicks(scopeKey: string) {
  const pending = listSyncErrorAllocations(scopeKey);
  if (!pending.length) {
    return { attempted: 0, confirmed: 0 };
  }

  const queue = [...pending];
  let confirmed = 0;

  const workers = Array.from({ length: Math.min(RETRY_CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) {
        return;
      }

      const result = await savePick(scopeKey, item.matchId, item.draft.allocations, { withRetries: true });
      if (result.confirmed) {
        confirmed += 1;
      }
    }
  });

  await Promise.all(workers);

  return { attempted: pending.length, confirmed };
}
