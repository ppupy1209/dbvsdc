import { describe, it, expect } from "vitest";
import { decodeShare, encodeShare, ShareState } from "../shareState";

const base: ShareState = {
  mode: "back",
  index: "sp",
  period: 15,
  salary: 4000,
  raise: 3,
  scenario: "worst",
  krw: false,
};

describe("shareState encode/decode", () => {
  it("round-trips a full state", () => {
    const s: ShareState = { ...base, mode: "fwd", index: "kq", period: 22, salary: 8000, raise: 6.5, scenario: "average", krw: true };
    expect(decodeShare(encodeShare(s))).toEqual(s);
  });

  it("ignores unknown / malformed fields rather than crashing", () => {
    const out = decodeShare("?mode=banana&idx=xyz&scn=nope&yrs=abc");
    expect(out.mode).toBeUndefined();
    expect(out.index).toBeUndefined();
    expect(out.scenario).toBeUndefined();
    expect(out.period).toBeUndefined();
  });

  it("clamps numbers to their valid ranges", () => {
    const out = decodeShare("?sal=999999&rai=-5&yrs=900");
    expect(out.salary).toBe(15000);
    expect(out.raise).toBe(0);
    expect(out.period).toBe(30);
  });

  it("returns an empty object for an empty query", () => {
    expect(decodeShare("")).toEqual({});
  });

  it("parses the krw flag both ways", () => {
    expect(decodeShare("?krw=1").krw).toBe(true);
    expect(decodeShare("?krw=0").krw).toBe(false);
    expect(decodeShare("?krw=").krw).toBeUndefined();
  });
});
