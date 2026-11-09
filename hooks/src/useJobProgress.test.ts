import { describe, expect, it } from "vitest";

import { isTerminalJobStatus, jobIsTerminal, jobPollInterval } from "./useJobProgress";

describe("useJobProgress stop rule", () => {
  it("keeps polling before the first answer and while running", () => {
    expect(jobPollInterval(undefined, 2000)).toBe(2000);
    expect(jobPollInterval({ status: "running" }, 2000)).toBe(2000);
    expect(jobPollInterval({ status: "queued" }, 500)).toBe(500);
  });

  it("stops on every terminal status", () => {
    for (const status of ["succeeded", "failed", "cancelled", "paused"]) {
      expect(jobPollInterval({ status }, 2000)).toBe(false);
    }
  });

  it("never stops a list poll on its own", () => {
    expect(jobIsTerminal({ items: [{ status: "failed" }], total: 1 })).toBe(false);
    expect(jobPollInterval({ items: [] }, 5000)).toBe(5000);
  });

  it("honours a caller's own terminal test", () => {
    const done = (d: { phase: string }) => d.phase === "finished";
    expect(jobPollInterval({ phase: "finished" }, 2000, done)).toBe(false);
    expect(jobPollInterval({ phase: "fetch" }, 2000, done)).toBe(2000);
  });

  it("classifies only strings", () => {
    expect(isTerminalJobStatus("failed")).toBe(true);
    expect(isTerminalJobStatus(null)).toBe(false);
    expect(isTerminalJobStatus("running")).toBe(false);
  });
});
