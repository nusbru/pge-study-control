import { describe, expect, it } from "vitest";
import { getSubjectGroup } from "@/modules/subjects/group";

describe("subject groups", () => {
  it("gives the same group and colors to codes sharing their first two digits", () => {
    const group = getSubjectGroup("1000 — Constitucionalismo");
    expect(group.code).toBe("10");

    for (const code of ["1010", "1001", "1002"]) {
      expect(getSubjectGroup(`${code} — Outro assunto`)).toEqual(group);
    }
  });

  it("distinguishes prefixes even when their first digit matches", () => {
    const ten = getSubjectGroup("1000 — Assunto");
    const eleven = getSubjectGroup("1100 — Assunto");
    expect(eleven.code).toBe("11");
    expect(eleven.color).not.toBe(ten.color);
    expect(getSubjectGroup("1109 — Novo assunto")).toEqual(eleven);
  });

  it("assigns distinct colors to every current catalog group", () => {
    const groups = ["10", "20", "30", "40", "50", "60", "70"];
    const colors = groups.map((code) => getSubjectGroup(`${code}00 — Assunto`).color);
    expect(new Set(colors).size).toBe(groups.length);
  });

  it("preserves leading zeroes and accepts whitespace and common separators", () => {
    expect(getSubjectGroup("  0100 - Assunto").code).toBe("01");
    expect(getSubjectGroup("1000–Assunto").code).toBe("10");
    expect(getSubjectGroup("1000 Assunto").code).toBe("10");
  });

  it.each(["", "Direito Civil", "Assunto 1000", "1 — Assunto", "1000abc", "10.5 — Assunto"])(
    "uses a neutral presentation for invalid or missing codes: %s",
    (subject) => {
      expect(getSubjectGroup(subject)).toEqual(getSubjectGroup("Sem código"));
      expect(getSubjectGroup(subject).code).toBeNull();
    },
  );
});
