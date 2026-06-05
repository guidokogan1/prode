import { formatNetAmount, settleTicket } from "@/lib/game";

export type SettlementInputRow = {
  ticketId: string;
  outcomeCode: string;
  amount: number;
};

export type ComputedSettlementRow = {
  ticketId: string;
  winningBetAmount: number;
  grossReturnAmount: number;
  netResultAmount: number;
};

export function computeMarketSettlements(
  allocations: SettlementInputRow[],
  winningOutcomeCode: string,
) {
  const totalPool = allocations.reduce((sum, row) => sum + row.amount, 0);
  const winningPool = allocations
    .filter((row) => row.outcomeCode === winningOutcomeCode)
    .reduce((sum, row) => sum + row.amount, 0);

  if (winningPool <= 0) {
    throw new Error("No hay credito apostado al outcome ganador.");
  }

  const winningStakeByTicket = new Map<string, number>();
  const ticketOrder: string[] = [];
  for (const row of allocations) {
    if (!winningStakeByTicket.has(row.ticketId)) {
      ticketOrder.push(row.ticketId);
      winningStakeByTicket.set(row.ticketId, 0);
    }
    if (row.outcomeCode === winningOutcomeCode) {
      winningStakeByTicket.set(row.ticketId, (winningStakeByTicket.get(row.ticketId) ?? 0) + row.amount);
    }
  }

  const rows = ticketOrder.map((ticketId) => {
    const winningStake = winningStakeByTicket.get(ticketId) ?? 0;
    const result = settleTicket({
      totalPool,
      winningPool,
      winningStake,
    });

    return {
      ticketId,
      winningBetAmount: winningStake,
      grossReturnAmount: Number(result.grossReturn.toFixed(2)),
      netResultAmount: Number(result.netResult.toFixed(2)),
    };
  });

  return {
    totalPool,
    winningPool,
    rows,
  };
}

export type LeaderboardInputRow = {
  userId: string;
  displayName: string;
  netResultAmount: number;
};

export function computeLeaderboard(rows: LeaderboardInputRow[]) {
  const grouped = new Map<
    string,
    {
      position: number;
      userId: string;
      name: string;
      totalNetAmount: number;
      netLabel: string;
      positiveTicketsCount: number;
      bestSingleNetAmount: number;
      bestHit: string;
    }
  >();

  for (const row of rows) {
    const current = grouped.get(row.userId) ?? {
      position: 0,
      userId: row.userId,
      name: row.displayName,
      totalNetAmount: 0,
      netLabel: "+0",
      positiveTicketsCount: 0,
      bestSingleNetAmount: Number.NEGATIVE_INFINITY,
      bestHit: "+0",
    };

    current.totalNetAmount += row.netResultAmount;
    if (row.netResultAmount > 0) {
      current.positiveTicketsCount += 1;
    }
    current.bestSingleNetAmount = Math.max(current.bestSingleNetAmount, row.netResultAmount);

    grouped.set(row.userId, current);
  }

  return [...grouped.values()]
    .sort((a, b) => {
      if (b.totalNetAmount !== a.totalNetAmount) {
        return b.totalNetAmount - a.totalNetAmount;
      }
      if (b.positiveTicketsCount !== a.positiveTicketsCount) {
        return b.positiveTicketsCount - a.positiveTicketsCount;
      }
      return b.bestSingleNetAmount - a.bestSingleNetAmount;
    })
    .map((row, index) => ({
      ...row,
      position: index + 1,
      netLabel: formatNetAmount(row.totalNetAmount),
      bestHit: formatNetAmount(row.bestSingleNetAmount),
    }));
}
