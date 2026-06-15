import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClientMock, getCurrentSessionMock, getActiveDemoPersonaSlugMock } = vi.hoisted(() => ({
  getSupabaseServerClientMock: vi.fn(),
  getCurrentSessionMock: vi.fn(),
  getActiveDemoPersonaSlugMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/server-session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/demo-state", () => ({
  getActiveDemoPersonaSlug: getActiveDemoPersonaSlugMock,
}));

import { getHistory } from "@/lib/repositories/history";
import { getMatchById } from "@/lib/repositories/matches";
import { getProfile } from "@/lib/repositories/profile";

describe("read repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveDemoPersonaSlugMock.mockResolvedValue("guido");
  });

  it("returns fallback profile when there is no session", async () => {
    getSupabaseServerClientMock.mockReturnValue({});
    getCurrentSessionMock.mockResolvedValue(null);

    const profile = await getProfile();

    expect(profile.name).toBe("Guido");
    expect(profile.championPick).toBeNull();
  });

  it("maps remote profile data into ui shape", async () => {
    getCurrentSessionMock.mockResolvedValue({ userId: "user-1" });

    const supabase = {
      from(table: string) {
        if (table === "users") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { display_name: "Mari" },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === "leaderboard_snapshots") {
          return {
            select() {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        limit() {
                          return {
                            maybeSingle: async () => ({
                              data: {
                                total_net_amount: 5523,
                                positive_tickets_count: 17,
                                best_single_net_amount: 9800,
                              },
                              error: null,
                            }),
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "champion_picks") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { team: { name: "Brasil" } },
                      error: null,
                    }),
                  };
                },
                in() {
                  const notChain = {
                    returns() {
                      return notChain;
                    },
                    then(onFulfilled: (value: { data: unknown[]; error: null }) => unknown) {
                      return Promise.resolve({ data: [], error: null }).then(onFulfilled);
                    },
                  };
                  return {
                    not() {
                      return notChain;
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "settlements") {
          const inChain = {
            returns() {
              return inChain;
            },
            then(onFulfilled: (value: { data: unknown[]; error: null }) => unknown) {
              return Promise.resolve({ data: [], error: null }).then(onFulfilled);
            },
          };
          return {
            select() {
              return {
                in() {
                  return inChain;
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    getSupabaseServerClientMock.mockReturnValue(supabase);

    const profile = await getProfile();

    expect(profile).toEqual({
      name: "Mari",
      netAmount: 5523,
      grossAmount: expect.any(Number),
      positiveTickets: 17,
      bestHitAmount: 9800,
      bestHitGrossAmount: expect.any(Number),
      championPick: "Brasil",
      isCurrentUser: true,
    });
  });

  it("returns fallback history when remote query is empty", async () => {
    getCurrentSessionMock.mockResolvedValue({ userId: "user-1" });
    getSupabaseServerClientMock.mockReturnValue({
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit: async () => ({
                        data: [],
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    });

    const history = await getHistory();

    expect(history.length).toBeGreaterThan(0);
    expect(history[0]?.title).toContain("Argentina");
  });

  it("maps remote history rows into readable items", async () => {
    getCurrentSessionMock.mockResolvedValue({ userId: "user-1" });
    getSupabaseServerClientMock.mockReturnValue({
      from(table: string) {
        if (table !== "settlements") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit: async () => ({
                        error: null,
                        data: [
                          {
                            ticket_id: "ticket-1",
                            net_result_amount: 2200,
                            match: {
                              home: { name: "Argentina" },
                              away: { name: "Japon" },
                              stage: { name: "Fase de grupos" },
                            },
                            allocations: [
                              { amount: 7000, outcome: { label: "Argentina" } },
                              { amount: 3000, outcome: { label: "Empate" } },
                            ],
                          },
                        ],
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    });

    const history = await getHistory();

    expect(history).toEqual([
      {
        id: "ticket-1-0",
        title: "Argentina vs Japon",
        stage: "Fase de grupos",
        description: "Jugada liquidada en positivo.",
        netAmount: 2200,
        grossAmount: 12200,
        allocations: [
          { label: "Argentina", amount: 7000 },
          { label: "Empate", amount: 3000 },
        ],
      },
    ]);
  });

  it("returns fallback match when there is no current session", async () => {
    getSupabaseServerClientMock.mockReturnValue({});
    getCurrentSessionMock.mockResolvedValue(null);

    const match = await getMatchById("arg-jpn");

    expect(match?.id).toBe("arg-jpn");
    expect(match?.userStateLabel).toBe("Tu jugada guardada");
  });

  it("applies remote ticket data and reveal data to the fallback match", async () => {
    getCurrentSessionMock.mockResolvedValue({ userId: "user-1" });

    const supabase = {
      from(table: string) {
        if (table === "match_markets") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { id: "market-1", status: "settled" },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === "tickets") {
          return {
            select(selection?: string) {
              if (selection?.includes("user:users")) {
                return {
                  eq: async () => ({
                    data: [
                      {
                        user: { display_name: "Guido" },
                        allocations: [
                          { amount: 7000, outcome: { label: "Argentina" } },
                          { amount: 2000, outcome: { label: "Empate" } },
                          { amount: 1000, outcome: { label: "Japon" } },
                        ],
                        settlement: { net_result_amount: 6154 },
                      },
                    ],
                    error: null,
                  }),
                };
              }

              return {
                eq(_field: string, value: string) {
                  if (value === "user-1") {
                    return {
                      eq() {
                        return {
                          maybeSingle: async () => ({
                            data: { id: "ticket-1" },
                            error: null,
                          }),
                        };
                      },
                    };
                  }

                  throw new Error(`Unexpected ticket query value ${value}`);
                },
              };
            },
          };
        }

        if (table === "ticket_allocations") {
          return {
            select() {
              return {
                eq() {
                  return {
                    returns: async () => ({
                      data: [
                        { amount: 7000, outcome: { label: "Argentina" } },
                        { amount: 2000, outcome: { label: "Empate" } },
                        { amount: 1000, outcome: { label: "Japon" } },
                      ],
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === "settlements") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { net_result_amount: 6154 },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    getSupabaseServerClientMock.mockReturnValue(supabase);

    const match = await getMatchById("arg-jpn");

    expect(match?.isEditable).toBe(false);
    expect(match?.userStateLabel).toBe("Resultado $16.154");
    expect(match?.allocation[0]?.amount).toBe(7000);
    expect(match?.revealedTickets[0]).toEqual({
      userName: "Guido",
      allocations: [
        { code: "home", label: "Argentina", shortLabel: "Argentina", amount: 7000 },
        { code: "draw", label: "Empate", shortLabel: "EMP", amount: 2000 },
        { code: "away", label: "Japon", shortLabel: "Japon", amount: 1000 },
      ],
      netAmount: 6154,
      grossAmount: 16154,
    });
  });
});
