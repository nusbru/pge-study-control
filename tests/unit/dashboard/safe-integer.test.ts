import { describe, expect, it } from "vitest";
import { bigintToSafeInteger } from "@/modules/dashboard/safe-integer";

describe("bigintToSafeInteger", () => {
  it("converts a cumulative count above PostgreSQL integer range", () => {
    expect(bigintToSafeInteger(BigInt("2148000000"))).toBe(2_148_000_000);
  });

  it("rejects a cumulative count outside JavaScript safe integer range", () => {
    expect(() => bigintToSafeInteger(BigInt("9007199254740992"))).toThrow(
      "O total agregado ultrapassa o limite numérico seguro.",
    );
  });
});
