import { MATCH_CREDIT, formatNetAmount, settleTicket } from "@/lib/game";
import { formatGross } from "@/lib/format";

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
    const refundedTicketIds: string[] = [];
    for (const row of allocations) {
      if (!refundedTicketIds.includes(row.ticketId)) {
        refundedTicketIds.push(row.ticketId);
      }
    }

    return {
      totalPool,
      winningPool,
      rows: refundedTicketIds.map((ticketId) => ({
        ticketId,
        winningBetAmount: 0,
        grossReturnAmount: MATCH_CREDIT,
        netResultAmount: 0,
      })),
    };
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
  stakeAmount?: number;
};

export function computeLeaderboard(rows: LeaderboardInputRow[]) {
  const grouped = new Map<
    string,
    {
      position: number;
      userId: string;
      name: string;
      totalNetAmount: number;
      totalGrossAmount: number;
      netLabel: string;
      grossLabel: string;
      positiveTicketsCount: number;
      bestSingleNetAmount: number;
      bestSingleGrossAmount: number;
      bestHit: string;
      bestHitGross: string;
    }
  >();

  for (const row of rows) {
    const stake = row.stakeAmount ?? MATCH_CREDIT;
    const grossThis = row.netResultAmount + stake;
    const current = grouped.get(row.userId) ?? {
      position: 0,
      userId: row.userId,
      name: row.displayName,
      totalNetAmount: 0,
      totalGrossAmount: 0,
      netLabel: "+0",
      grossLabel: "$0",
      positiveTicketsCount: 0,
      bestSingleNetAmount: Number.NEGATIVE_INFINITY,
      bestSingleGrossAmount: 0,
      bestHit: "+0",
      bestHitGross: "$0",
    };

    current.totalNetAmount += row.netResultAmount;
    current.totalGrossAmount += grossThis;
    if (row.netResultAmount > 0) {
      current.positiveTicketsCount += 1;
    }
    current.bestSingleNetAmount = Math.max(current.bestSingleNetAmount, row.netResultAmount);
    current.bestSingleGrossAmount = Math.max(current.bestSingleGrossAmount, grossThis);

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
      grossLabel: formatGross(row.totalGrossAmount),
      bestHit: formatNetAmount(row.bestSingleNetAmount),
      bestHitGross: formatGross(row.bestSingleGrossAmount),
    }));
}
