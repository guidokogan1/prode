import { describe, expect, it } from "vitest";
import { createSessionToken, hashPin, hashSessionToken, verifyPin } from "@/lib/auth";

describe("auth primitives", () => {
  it("hashes and verifies a valid pin", () => {
    const hash = hashPin("1234");

    expect(hash).toContain(":");
    expect(verifyPin("1234", hash)).toBe(true);
    expect(verifyPin("9999", hash)).toBe(false);
  });

  it("rejects malformed stored pin hashes", () => {
    expect(verifyPin("1234", "broken-value")).toBe(false);
  });

  it("creates opaque session tokens and deterministic token hashes", () => {
    const token = createSessionToken();
    const sameHash = hashSessionToken(token);
    const sameHashAgain = hashSessionToken(token);

    expect(token).toHaveLength(64);
    expect(sameHash).toBe(sameHashAgain);
    expect(hashSessionToken("other-token")).not.toBe(sameHash);
  });
});
