import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveTicket } from "@/lib/repositories/tickets";

const { getFallbackMatchByIdMock, getSupabaseServerClientMock, getCurrentSessionMock } = vi.hoisted(() => ({
  getFallbackMatchByIdMock: vi.fn(),
  getSupabaseServerClientMock: vi.fn(),
  getCurrentSessionMock: vi.fn(),
}));

vi.mock("@/lib/mock-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mock-data")>();
  return {
    ...actual,
    getFallbackMatchById: getFallbackMatchByIdMock,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/server-session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

function makeSupabaseMock(config: {
  market?: { data: { id: string; status: string; lock_at: string | null } | null; error: unknown | null };
  outcomes?: { data: Array<{ id: string; label: string }> | null; error: unknown | null };
  ticketUpsert?: { data: { id: string } | null; error: unknown | null };
  deleteError?: unknown | null;
  insertError?: unknown | null;
}) {
  return {
    from(table: string) {
      if (table === "match_markets") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () =>
                    config.market ?? { data: null, error: null },
                };
              },
            };
          },
        };
      }

      if (table === "market_outcomes") {
        return {
          select() {
            return {
              eq() {
                return {
                  returns: async () =>
                    config.outcomes ?? { data: [], error: null },
                };
              },
            };
          },
        };
      }

      if (table === "tickets") {
        return {
          upsert() {
            return {
              select() {
                return {
                  single: async () =>
                    config.ticketUpsert ?? { data: { id: "ticket-1" }, error: null },
                };
              },
            };
          },
        };
      }

      if (table === "ticket_allocations") {
        return {
          upsert: async () => ({ error: config.insertError ?? null }),
          delete() {
            return {
              eq() {
                return {
                  not: async () => ({ error: config.deleteError ?? null }),
                };
              },
            };
          },
        };
      }

      if (table === "pick_events") {
        return {
          insert: async () => ({ error: null }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe("saveTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentSessionMock.mockResolvedValue({ userId: "user-1", displayName: "Guido" });
    getFallbackMatchByIdMock.mockReturnValue({
      id: "arg-jpn",
      isEditable: true,
    });
  });

  it("rejects invalid allocations before any persistence", async () => {
    const result = await saveTicket({
      matchId: "arg-jpn",
      displayName: "Guido",
      allocations: [
        { label: "Argentina", amount: 6000 },
        { label: "Empate", amount: 2000 },
        { label: "Japon", amount: 1000 },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("10000");
    }
    expect(getCurrentSessionMock).not.toHaveBeenCalled();
  });

  it("rejects unknown matches", async () => {
    getFallbackMatchByIdMock.mockReturnValue(null);

    const result = await saveTicket({
      matchId: "missing",
      displayName: "Guido",
      allocations: [
        { label: "Argentina", amount: 7000 },
        { label: "Empate", amount: 2000 },
        { label: "Japon", amount: 1000 },
      ],
    });

    expect(result).toEqual({
      ok: false,
      state: "sync_error",
      reason: "Partido no encontrado.",
    });
  });

  it("falls back to local mode when there is no supabase client", async () => {
    getSupabaseServerClientMock.mockReturnValue(null);

    const result = await saveTicket({
      matchId: "arg-jpn",
      displayName: "Guido",
      allocations: [
        { label: "Argentina", amount: 7000 },
        { label: "Empate", amount: 2000 },
        { label: "Japon", amount: 1000 },
      ],
    });

    expect(result).toEqual({
      ok: true,
      mode: "local",
      state: "saved_local",
      message: "Borrador guardado en este dispositivo.",
    });
  });

  it("rejects a closed remote market", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      makeSupabaseMock({
        market: {
          data: { id: "market-1", status: "revealed", lock_at: null },
          error: null,
        },
      }),
    );

    const result = await saveTicket({
      matchId: "arg-jpn",
      displayName: "Guido",
      allocations: [
        { label: "Argentina", amount: 7000 },
        { label: "Empate", amount: 2000 },
        { label: "Japon", amount: 1000 },
      ],
    });

    expect(result).toEqual({
      ok: false,
      state: "sync_error",
      reason: "Este mercado ya cerró y no admite cambios.",
    });
  });

  it("rejects allocations that do not match remote outcomes", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      makeSupabaseMock({
        market: {
          data: { id: "market-1", status: "open", lock_at: null },
          error: null,
        },
        outcomes: {
          data: [
            { id: "o1", label: "Argentina" },
            { id: "o2", label: "Empate" },
          ],
          error: null,
        },
        ticketUpsert: { data: { id: "ticket-1" }, error: null },
      }),
    );

    const result = await saveTicket({
      matchId: "arg-jpn",
      displayName: "Guido",
      allocations: [
        { label: "Argentina", amount: 7000 },
        { label: "Empate", amount: 2000 },
        { label: "Japon", amount: 1000 },
      ],
    });

    expect(result).toEqual({
      ok: false,
      state: "sync_error",
      reason: "No coinciden las opciones de la jugada con las del mercado.",
    });
  });

  it("saves remotely when user, market and outcomes are valid", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      makeSupabaseMock({
        market: {
          data: { id: "market-1", status: "open", lock_at: null },
          error: null,
        },
        outcomes: {
          data: [
            { id: "o1", label: "Argentina" },
            { id: "o2", label: "Empate" },
            { id: "o3", label: "Japon" },
          ],
          error: null,
        },
        ticketUpsert: { data: { id: "ticket-1" }, error: null },
      }),
    );

    const result = await saveTicket({
      matchId: "arg-jpn",
      displayName: "Guido",
      allocations: [
        { label: "Argentina", amount: 7000 },
        { label: "Empate", amount: 2000 },
        { label: "Japon", amount: 1000 },
      ],
    });

    expect(result).toEqual({
      ok: true,
      mode: "remote",
      state: "saved_remote",
      message: "Jugada guardada en backend.",
    });
  });
});
