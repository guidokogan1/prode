export const MATCH_CREDIT = 10_000;
export const OUTCOME_CAP = 7_000;

export type AllocationInput = {
  outcomeCode: string;
  amount: number;
};

export type SettlementBreakdown = {
  totalPool: number;
  winningPool: number;
  winningStake: number;
  grossReturn: number;
  netResult: number;
};

export function sumAllocations(allocations: AllocationInput[]) {
  return allocations.reduce((total, allocation) => total + allocation.amount, 0);
}

export function validateAllocations(allocations: AllocationInput[]) {
  const total = sumAllocations(allocations);

  if (total !== MATCH_CREDIT) {
    return {
      ok: false,
      reason: `La jugada debe sumar ${MATCH_CREDIT}.`,
    };
  }

  const hasNegative = allocations.some((allocation) => allocation.amount < 0);

  if (hasNegative) {
    return {
      ok: false,
      reason: "No puede haber montos negativos.",
    };
  }

  const exceedsCap = allocations.some((allocation) => allocation.amount > OUTCOME_CAP);

  if (exceedsCap) {
    return {
      ok: false,
      reason: `Ningun outcome puede superar ${OUTCOME_CAP}.`,
    };
  }

  return {
    ok: true,
    reason: null,
  };
}

export function settleTicket(params: {
  totalPool: number;
  winningPool: number;
  winningStake: number;
}): SettlementBreakdown {
  const { totalPool, winningPool, winningStake } = params;

  if (winningPool <= 0) {
    throw new Error("winningPool debe ser mayor a cero");
  }

  if (winningStake < 0) {
    throw new Error("winningStake no puede ser negativo");
  }

  const grossReturn = totalPool * (winningStake / winningPool);
  const netResult = grossReturn - MATCH_CREDIT;

  return {
    totalPool,
    winningPool,
    winningStake,
    grossReturn,
    netResult,
  };
}

export function formatNetAmount(amount: number) {
  return `${amount >= 0 ? "+" : "-"}${Math.abs(Math.round(amount)).toLocaleString("es-AR")}`;
}

export function isMarketEditable(params: {
  status: "open" | "locked" | "revealed" | "settled" | string;
  lockAt?: string | null;
  now?: number;
}) {
  const { status, lockAt, now = Date.now() } = params;

  if (status !== "open") {
    return false;
  }

  if (!lockAt) {
    return true;
  }

  return new Date(lockAt).getTime() > now;
}
