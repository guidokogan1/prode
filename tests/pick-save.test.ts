import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settleAnimations } from "@/lib/motion-settle";

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
}

function installBrowser(storage: Partial<MemoryStorage>) {
  vi.stubGlobal("window", {
    localStorage: storage,
    dispatchEvent: () => true,
  });
  vi.stubGlobal("CustomEvent", class {
    constructor(
      public type: string,
      public init?: unknown,
    ) {}
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("settleAnimations", () => {
  it("resolves even when an animation promise never settles", async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise(() => {});

    let done = false;
    void settleAnimations([neverSettles]).then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toBe(true);
    vi.useRealTimers();
  });

  it("resolves when an animation promise rejects", async () => {
    await expect(settleAnimations([Promise.reject(new Error("cancelled"))])).resolves.toBeUndefined();
  });
});

describe("savePick", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reports unconfirmed and keeps the draft when the server rejects", async () => {
    installBrowser(new MemoryStorage());
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ reason: "Mercado cerrado" }), { status: 400 })));

    const { savePick } = await import("@/lib/pick-save");
    const { getStoredAllocation } = await import("@/lib/local-store");

    const result = await savePick("remote:u1", "match-1", [{ code: "home", label: "Local", amount: 10000 }]);

    expect(result.confirmed).toBe(false);
    expect(result.reason).toBe("Mercado cerrado");
    expect(getStoredAllocation("remote:u1", "match-1")?.status).toBe("sync_error");
  });

  it("reports unconfirmed when the network throws", async () => {
    installBrowser(new MemoryStorage());
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));

    const { savePick } = await import("@/lib/pick-save");
    const { getStoredAllocation } = await import("@/lib/local-store");

    const result = await savePick("remote:u1", "match-1", [{ code: "home", label: "Local", amount: 10000 }]);

    expect(result.confirmed).toBe(false);
    expect(getStoredAllocation("remote:u1", "match-1")?.status).toBe("sync_error");
  });

  it("confirms and marks the draft as remote on success", async () => {
    installBrowser(new MemoryStorage());
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));

    const { savePick } = await import("@/lib/pick-save");
    const { getStoredAllocation } = await import("@/lib/local-store");

    const result = await savePick("remote:u1", "match-1", [{ code: "home", label: "Local", amount: 10000 }]);

    expect(result.confirmed).toBe(true);
    expect(getStoredAllocation("remote:u1", "match-1")?.status).toBe("saved_remote");
  });

  it("never throws when localStorage is unavailable", async () => {
    installBrowser({
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("QuotaExceededError");
      },
      key: () => null,
      length: 0,
    } as unknown as MemoryStorage);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));

    const { savePick } = await import("@/lib/pick-save");

    await expect(savePick("remote:u1", "match-1", [{ code: "home", label: "Local", amount: 10000 }])).resolves.toEqual({
      confirmed: true,
    });
  });
});
