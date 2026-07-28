import { formatNetAmount as formatNetAmountValue } from "@/lib/format";

export const MATCH_CREDIT = 10_000;
export const KNOCKOUT_CREDIT = 15_000;
export const OUTCOME_CAP = MATCH_CREDIT;

export function creditForMarketType(marketType?: string | null) {
  return marketType === "qualifies" ? KNOCKOUT_CREDIT : MATCH_CREDIT;
}

export type AllocationInput = {
  outcomeCode: string;
  amount: number;
};

export function buildSinglePickAllocation(
  outcomeCodes: string[],
  selectedOutcomeCode: string,
  credit: number = MATCH_CREDIT,
): AllocationInput[] {
  if (!outcomeCodes.includes(selectedOutcomeCode)) {
    throw new Error("selectedOutcomeCode invalido");
  }

  if (outcomeCodes.length < 2) {
    throw new Error("Se necesitan al menos 2 outcomes");
  }

  return outcomeCodes.map((outcomeCode) => ({
    outcomeCode,
    amount: outcomeCode === selectedOutcomeCode ? credit : 0,
  }));
}

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

export function validateAllocations(allocations: AllocationInput[], credit: number = MATCH_CREDIT) {
  const total = sumAllocations(allocations);

  if (total !== credit) {
    return {
      ok: false,
      reason: `La jugada debe sumar ${credit}.`,
    };
  }

  const hasNegative = allocations.some((allocation) => allocation.amount < 0);

  if (hasNegative) {
    return {
      ok: false,
      reason: "No puede haber montos negativos.",
    };
  }

  const exceedsCap = allocations.some((allocation) => allocation.amount > credit);

  if (exceedsCap) {
    return {
      ok: false,
      reason: `Ningun outcome puede superar ${credit}.`,
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
  credit?: number;
}): SettlementBreakdown {
  const { totalPool, winningPool, winningStake, credit = MATCH_CREDIT } = params;

  if (winningPool <= 0) {
    throw new Error("winningPool debe ser mayor a cero");
  }

  if (winningStake < 0) {
    throw new Error("winningStake no puede ser negativo");
  }

  const grossReturn = totalPool * (winningStake / winningPool);
  const netResult = grossReturn - credit;

  return {
    totalPool,
    winningPool,
    winningStake,
    grossReturn,
    netResult,
  };
}

export function formatNetAmount(amount: number) {
  return formatNetAmountValue(amount);
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
