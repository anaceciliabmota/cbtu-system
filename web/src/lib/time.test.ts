import { describe, expect, it } from "vitest";
import { applyOffset, secondsToTimeString, timeStringToSeconds } from "./time";

describe("time conversions", () => {
  it("roundtrips seconds ↔ HH:MM", () => {
    const cases = [
      [0, "00:00"],
      [3600, "01:00"],
      [28800, "08:00"],
      [34260, "09:31"],
      [86340, "23:59"],
    ] as const;
    for (const [seconds, expected] of cases) {
      expect(secondsToTimeString(seconds)).toBe(expected);
      expect(timeStringToSeconds(expected)).toBe(seconds);
    }
  });

  it("subtracts offset from first interval start", () => {
    const raw = [
      [timeStringToSeconds("08:00"), timeStringToSeconds("12:47")],
      [timeStringToSeconds("12:47"), timeStringToSeconds("17:34")],
    ];
    const max = timeStringToSeconds("17:34");
    const { intervals, maxTime } = applyOffset(raw, max);
    expect(intervals[0][0]).toBe(0);
    expect(intervals[1][0]).toBe(intervals[0][1]);
    expect(maxTime).toBe(intervals[intervals.length - 1][1]);
  });

  it("leaves values unchanged when offset is zero", () => {
    const raw = [
      [0, timeStringToSeconds("04:46")],
      [timeStringToSeconds("04:46"), timeStringToSeconds("09:33")],
    ];
    const { intervals } = applyOffset(raw, raw[raw.length - 1][1]);
    expect(intervals).toEqual(raw);
  });
});
