import { formatNetAmount as formatNetAmountValue } from "@/lib/format";

export const MATCH_CREDIT = 10_000;
export const OUTCOME_CAP = MATCH_CREDIT;

export type IntensityPreset = "soft" | "medium" | "hard";

export type AllocationInput = {
  outcomeCode: string;
  amount: number;
};

export function buildFocusedAllocation(outcomeCodes: string[], selectedOutcomeCode: string) {
  return buildPresetAllocation(outcomeCodes, selectedOutcomeCode, "hard");
}

export function buildBalancedAllocation(outcomeCodes: string[]) {
  if (outcomeCodes.length < 2) {
    throw new Error("Se necesitan al menos 2 outcomes");
  }

  const baseAmount = Math.floor(MATCH_CREDIT / outcomeCodes.length);
  let carry = MATCH_CREDIT - baseAmount * outcomeCodes.length;

  return outcomeCodes.map((outcomeCode) => {
    const amount = baseAmount + (carry > 0 ? 1 : 0);
    carry = Math.max(0, carry - 1);
    return { outcomeCode, amount };
  });
}

export function buildWeightedAllocation(
  outcomeCodes: string[],
  selectedOutcomeCode: string,
  focusedAmount: number,
) {
  if (!outcomeCodes.includes(selectedOutcomeCode)) {
    throw new Error("selectedOutcomeCode invalido");
  }

  if (outcomeCodes.length < 2) {
    throw new Error("Se necesitan al menos 2 outcomes");
  }

  if (focusedAmount < 0 || focusedAmount > OUTCOME_CAP) {
    throw new Error("focusedAmount invalido");
  }

  const remainder = MATCH_CREDIT - focusedAmount;
  const otherCodes = outcomeCodes.filter((code) => code !== selectedOutcomeCode);
  const baseOtherAmount = Math.floor(remainder / otherCodes.length);
  let carry = remainder - baseOtherAmount * otherCodes.length;

  return outcomeCodes.map((outcomeCode) => {
    if (outcomeCode === selectedOutcomeCode) {
      return {
        outcomeCode,
        amount: focusedAmount,
      };
    }

    const nextAmount = baseOtherAmount + (carry > 0 ? 1 : 0);
    carry = Math.max(0, carry - 1);

    return {
      outcomeCode,
      amount: nextAmount,
    };
  });
}

export function buildPresetAllocation(
  outcomeCodes: string[],
  selectedOutcomeCode: string,
  intensity: IntensityPreset,
) {
  if (!outcomeCodes.includes(selectedOutcomeCode)) {
    throw new Error("selectedOutcomeCode invalido");
  }

  if (outcomeCodes.length < 2) {
    throw new Error("Se necesitan al menos 2 outcomes");
  }

  if (outcomeCodes.length === 2) {
    const selectedAmount = intensity === "soft" ? 6000 : intensity === "medium" ? 8000 : 10000;
    const otherAmount = MATCH_CREDIT - selectedAmount;

    return outcomeCodes.map((outcomeCode) => ({
      outcomeCode,
      amount: outcomeCode === selectedOutcomeCode ? selectedAmount : otherAmount,
    }));
  }

  const drawLikeCode =
    outcomeCodes.find((code) => code === "draw") ??
    outcomeCodes.find((code) => code.toLowerCase() === "x") ??
    null;

  if (outcomeCodes.length === 3 && drawLikeCode) {
    const drawCode = drawLikeCode;
    const otherSideCode = outcomeCodes.find((code) => code !== selectedOutcomeCode && code !== drawCode) ?? null;

    if (selectedOutcomeCode === drawCode) {
      const drawAmount = intensity === "soft" ? 4000 : intensity === "medium" ? 6000 : 8000;
      const sideAmount = intensity === "soft" ? 3000 : intensity === "medium" ? 2000 : 1000;

      return outcomeCodes.map((outcomeCode) => ({
        outcomeCode,
        amount: outcomeCode === drawCode ? drawAmount : sideAmount,
      }));
    }

    if (!otherSideCode) {
      throw new Error("No se pudo resolver el outcome opuesto");
    }

    const selectedAmount = intensity === "soft" ? 5000 : intensity === "medium" ? 7000 : 9000;
    const drawAmount = intensity === "soft" ? 3000 : intensity === "medium" ? 3000 : 1000;
    const otherAmount = MATCH_CREDIT - selectedAmount - drawAmount;

    return outcomeCodes.map((outcomeCode) => {
      if (outcomeCode === selectedOutcomeCode) {
        return { outcomeCode, amount: selectedAmount };
      }

      if (outcomeCode === drawCode) {
        return { outcomeCode, amount: drawAmount };
      }

      return { outcomeCode, amount: otherAmount };
    });
  }

  const focusedAmount = intensity === "soft" ? 6000 : intensity === "medium" ? 8000 : 10000;
  return buildWeightedAllocation(outcomeCodes, selectedOutcomeCode, focusedAmount);
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
